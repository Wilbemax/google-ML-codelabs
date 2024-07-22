const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
let model; // Глобальная переменная для хранения загруженной модели
let children = []; // Глобальная переменная для хранения элементов
let stream; // Переменная для хранения текущего медиа потока

// Проверка поддержки getUserMedia
function getUserMediaSupported() {
	return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Добавление слушателя событий на кнопку включения веб-камеры, если поддерживается
if (getUserMediaSupported()) {
	enableWebcamButton.addEventListener('click', enableCam);
} else {
	console.warn('getUserMedia() is not supported by your browser');
}

// Включение веб-камеры и начало классификации
function enableCam(event) {
	// Только продолжить, если модель COCO-SSD загружена
	if (!model) {
		console.warn('Model not loaded');
		return;
	}

	// Скрыть кнопку после нажатия
	event.target.classList.add('removed');

	// Остановить существующий поток, если он есть
	if (stream) {
		stream.getTracks().forEach((track) => track.stop());
	}

	// Параметры getUserMedia для принудительного использования видео, но не аудио
	const constraints = {
		video: true,
	};

	// Активация потока веб-камеры
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(function (newStream) {
			stream = newStream;
			video.srcObject = stream;
			video.addEventListener('loadeddata', predictWebcam);
		})
		.catch(function (error) {
			console.error('Error accessing webcam: ', error);
		});
}

function predictWebcam() {
	// Now let's start classifying a frame in the stream.
	model.detect(video).then(function (predictions) {
		// Remove any highlighting we did previous frame.
		for (let i = 0; i < children.length; i++) {
			liveView.removeChild(children[i]);
		}
		children.splice(0);

		// Now lets loop through predictions and draw them to the live view if
		// they have a high confidence score.
		for (let n = 0; n < predictions.length; n++) {
			// If we are over 66% sure we are sure we classified it right, draw it!
			if (predictions[n].score > 0.66) {
				const p = document.createElement('p');
				p.innerText =
					predictions[n].class +
					' - with ' +
					Math.round(parseFloat(predictions[n].score) * 100) +
					'% confidence.';
				p.style =
					'margin-left: ' +
					predictions[n].bbox[0] +
					'px; margin-top: ' +
					(predictions[n].bbox[1] - 10) +
					'px; width: ' +
					(predictions[n].bbox[2] - 10) +
					'px; top: 0; left: 0;';

				const highlighter = document.createElement('div');
				highlighter.setAttribute('class', 'highlighter');
				highlighter.style =
					'left: ' +
					predictions[n].bbox[0] +
					'px; top: ' +
					predictions[n].bbox[1] +
					'px; width: ' +
					predictions[n].bbox[2] +
					'px; height: ' +
					predictions[n].bbox[3] +
					'px;';

				liveView.appendChild(highlighter);
				liveView.appendChild(p);
				children.push(highlighter);
				children.push(p);
			}
		}

		// Call this function again to keep predicting when the browser is ready.
		window.requestAnimationFrame(predictWebcam);
	});
}

// Загрузка модели COCO-SSD
cocoSsd.load().then(function (loadedModel) {
	model = loadedModel;
	console.log('Model loaded', model);
	// Показываем раздел демо, когда модель готова к использованию
	demosSection.classList.remove('invisible');
});
