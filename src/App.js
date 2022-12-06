import React, { useEffect, useRef, useState } from 'react'
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler'
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import '@tensorflow/tfjs-backend-webgl'
import './App.css';
import { Round } from '@tensorflow/tfjs';
import soundURL from './assets/hey_sondn.mp3'

var sound = new Howl({
  src: [soundURL]
})
// sound.play()

const NOT_TOUCH_LABEL = 'not_touch'
const TOUCHED_LABEL = 'touched'
const TRAINING_TIMES = 50;
const TOUCH_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false)

  const init = async () => {
    console.log('init...');
    await setupCamara();
    console.log('setup camera succeed!');

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();

    console.log('setup done');
    console.log('Khong cham tay len mat va bam Train 1');
    initNotifications({ cooldown: 3000 });
  }

  const setupCamara = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
        || navigator.mozGetUserMedia || navigator.msGetUserMedia

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject(error)
        )
      }
      else {
        reject()
      }

    })
  }

  const train = async label => {
    console.log(`[${label}] Đang train cho máy mặt đẹp troai của bạn...`);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progess ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);

      await training(label);
    }

  }

  const training = label => {
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      )
      classifier.current.addExample(embedding, label)
      await sleep(100);
      resolve()
    })
  }

  const Run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    )
    const result = await classifier.current.predictClass(embedding);

    // console.log('label: ', result.label);
    // console.log('Confidences: ', result.confidences);

    if (result.label === TOUCHED_LABEL && result.confidences[result.label] > TOUCH_CONFIDENCE) {
      console.log('Touched');
      if (canPlaySound.current) {
        canPlaySound.current = false
        sound.play()
      }
      notify('Bỏ tay ra!', { body: 'Bạn vừa chạm tay vào mặt!' });
      setTouched(true)
    }
    else {
      console.log('Not touch');
      setTouched(false)
    }

    await sleep(200);

    Run()
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    sound.on('end', function () {
      console.log('Finished');
      canPlaySound.current = true
    })

    //clean up
    return () => {

    }
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video
        ref={video}
        className='video'
        autoPlay
      />
      <div className='control'>
        <button className='btn' onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className='btn' onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className='btn' onClick={() => Run()}>Run</button>
      </div>
    </div>
  );
}

export default App;
