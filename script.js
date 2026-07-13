let videoElement = document.querySelector(".input_video"),
  guideCanvas = document.querySelector('canvas.guides'),
  maskCanvas = document.querySelector('canvas.masked');

const recordButton = document.getElementById("recordButton");
let recordFlag = false;
let playFlag = false;
let toggleRecording = () => {
  recordFlag = !recordFlag;
  if (recordFlag) {
    console.log("Recording Started");
    playFlag = false;
    recordIndex = 0;
    recordStartTime = performance.now();
    audio.play();
    recordButton.value = "Stop Recording";
  } else {
    console.log("Recording Stopped");
    audio.pause();
    audio.currentTime = 0;
    recordButton.value = "Start Recording";
  }
}
const drawMask = (results) => {
  maskCanvas.width = videoElement.videoWidth;
  maskCanvas.height = videoElement.videoHeight;
  let canvasCtx = maskCanvas.getContext('2d');
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  canvasCtx.drawImage(results.segmentationMask, 0, 0,
    maskCanvas.width, maskCanvas.height);
  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = 'source-in';
  canvasCtx.fillStyle = '#00FF00';
  canvasCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(
    results.image, 0, 0, maskCanvas.width, maskCanvas.height);
  canvasCtx.restore();


}
let audioInput = document.getElementById("audioInput");
audioInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  audio = new Audio(URL.createObjectURL(file));
  audio.addEventListener("ended", () => {
    playFlag = false;
    recordIndex = 0;

  })
});


const onResults = (results) => {
  if (recordFlag) {
    record.push({
      t: performance.now() - recordStartTime,
      results: {
        poseLandmarks: results.poseLandmarks,
      }
    });
  }
  if (playFlag) {
    return;
  }
  // Draw landmark guides
  drawResults(results)
}

let playRecording = () => {
  console.log(record);
  if (record.length === 0) {
    console.log("No recording to play");
    return;
  }
  recordFlag = false;
  playFlag = true;
  recordIndex = 0;
  playStartTime = performance.now();

  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }

}

const drawResults = (results) => {
  guideCanvas.width = videoElement.videoWidth;
  guideCanvas.height = videoElement.videoHeight;
  let canvasCtx = guideCanvas.getContext('2d');
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
  // Use `Mediapipe` drawing functions
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: "#00cff7",
    lineWidth: 4
  });
  drawLandmarks(canvasCtx, results.poseLandmarks, {
    color: "#ff0364",
    lineWidth: 2
  });



}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  }
});
pose.setOptions({
  modelComplexity: 2,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);
const selfieSegmentation = new SelfieSegmentation({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1/${file}`;
  }
});
selfieSegmentation.setOptions({
  modelSelection: 1,
});
selfieSegmentation.onResults(drawMask);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({ image: videoElement });
    await selfieSegmentation.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();


