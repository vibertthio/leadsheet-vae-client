import React, { Component } from 'react';
import { render } from 'react-dom';

import styles from './index.module.scss';
import info from './assets/info.png';
import Sound from './music/sound';
import Renderer from './renderer/renderer';
import playSvg from './assets/play.png';
import pauseSvg from './assets/pause.png';
import shufflePng from './assets/shuffle.png';
import sig from './assets/sig.png';


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      slash: true,
      open: false,
      playing: false,
      dragging: false,
      loadingProgress: 0,
      instructionStage: 0,
      loading: true,
      currentTableIndex: 4,
      rhythmThreshold: 0.6,
      bpm: 120,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      },
      songs: [
        'blank',
        'blank',
      ],
    };

    this.sound = new Sound(this),
    this.canvas = [];
    this.matrix = [];
    this.bpms = [];
    this.chords = [];
    this.rawMatrix = [];
    this.beat = 0;
    // this.serverUrl = 'http://140.109.21.193:5003/';
    // this.serverUrl = 'http://140.109.135.76:5003/';
    // this.serverUrl = 'http://140.109.16.227:5003/';
    this.serverUrl = 'http://musicai.citi.sinica.edu.tw/songmashup/';
  }

  componentDidMount() {
    this.renderer = new Renderer(this, this.canvas);
    if (!this.state.loading) {
      this.renderer.draw(this.state.screen);
    }
    window.addEventListener('keydown', this.onKeyDown.bind(this), false);
    window.addEventListener('resize', this.handleResize.bind(this, false));
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    // window.addEventListener('click', this.handleClick.bind(this));
    // window.addEventListener('mouseup', this.handleMouseUp.bind(this));

    requestAnimationFrame(() => { this.update() });
    this.getLeadsheetVaeStatic(false);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    window.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    // window.removeEventListener('click', this.handleClick.bind(this));
    // window.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    window.removeEventListener('resize', this.handleResize.bind(this, false));
  }

  changeMatrix(mat) {
    this.rawMatrix = mat;
    this.updateMatrix()
  }

  changeChords(c) {
    this.chords = c;
    this.sound.chords = c;
    this.renderer.chords = c;
  }

  updateMatrix() {
    const m = this.rawMatrix;
    this.matrix = m;
    this.renderer.changeMatrix(m);
    this.sound.changeMatrix(m);
  }

  postChangeThreshold(amt = 0.3, restart = false) {
    const url = this.serverUrl + 'api/theta';
    fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        m_seq_1: this.matrix[0],
        c_seq_1: this.chords[0],
        m_seq_2: this.matrix[this.matrix.length - 1],
        c_seq_2: this.chords[this.chords.length - 1],
        tempo_1: this.bpms[0],
        tempo_2: this.bpms[1],
        theta: amt,
      }),
    })
      .then(r => r.json())
      .then(r => {
        this.changeMatrix(r['melody']);
        this.changeChords(r['chord']);
        this.bpms = r['tempo'];
        if (restart) {
          this.start();
          this.sound.changeSection(0);
          this.renderer.triggerStartAnimation();
        }
      })
      .catch(e => console.log(e));
  }

  getLeadsheetVae(url, restart = true) {
    fetch(url, {
      headers: {
        'content-type': 'application/json'
      },
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
    })
      .then(r => r.json())
      .then(r => {
        this.changeMatrix(r['melody']);
        this.changeChords(r['chord']);
        this.bpms = r['tempo'];
        console.log(r);
        if (restart) {
          this.start();
          this.sound.changeSection(0);
          this.renderer.triggerStartAnimation();
        }

        if (this.renderer.instructionState === 0) {
          this.renderer.pianorollGrids[0].showingInstruction = true;
        }

        this.setState({
          songs: r['songnames'],
          loading: false,
          rhythmThreshold: r['theta'],
        });
      })
      .catch(e => console.log(e));
  }

  getLeadsheetVaeRandom() {
    let s1 = Math.floor(Math.random() * 4);
    let s2 = Math.floor(Math.random() * 4);
    while (s2 === s1) {
      s2 = Math.floor(Math.random() * 4);
    }

    // console.log(`s1: ${s1}, s2: ${s2}`);
    s1 = s1.toString();
    s2 = s2.toString();

    const url = this.serverUrl + `static/${s1}/${s2}`;
    this.getLeadsheetVae(url);
  }

  getLeadsheetVaeStatic(restart = true) {
    const url = this.serverUrl + 'static';
    this.getLeadsheetVae(url, restart);
  }

  update() {
    const { beat, barIndex, sectionIndex } = this.sound;
    this.renderer.draw(this.state.screen, sectionIndex, barIndex, beat);
    requestAnimationFrame(() => { this.update() });
  }

  handleResize(value, e) {
    this.setState({
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      }
    });
  }

  handleClick(e) {
    e.stopPropagation();
  }

  handleMouseDown(e) {
    e.stopPropagation();
    if (!this.state.slash) {
      const [onInterpolation, onPianoroll] = this.renderer.handleMouseDown(e);
      if (onInterpolation) {
        const { playing } = this.state;
        this.sound.changeSection(this.renderer.sectionIndex);
        this.sound.loop = true;
        if (!playing) {
          this.start();
        }
      } else if (onPianoroll === 3) {

        const { playing } = this.state;
        // this.sound.changeSection(Math.floor(this.matrix.length / 2));
        this.sound.changeSection(0);
        this.sound.loop = true;
        if (!playing) {
          this.start();
        }
      }

      if (onPianoroll === 0) {
        this.sound.loop = false;
        this.sound.changeSection(0);
        this.start();
      } else if (onPianoroll === 2) {
        this.sound.loop = false;
        this.sound.changeSection(this.matrix.length - 1);
        this.start();
      } else if (onPianoroll === 1) {
        const { playing } = this.state;
        this.sound.changeSection(this.renderer.sectionIndex);
        this.sound.loop = true;
        if (!playing) {
          this.start();
        }
      }
    }
  }

  handleMouseUp(e) {
    e.stopPropagation();
    // const dragging = this.renderer.handleMouseDown(e);
  }

  handleMouseMove(e) {
    e.stopPropagation();
    this.renderer.handleMouseMove(e);
  }

  handleClickMenu() {
    const { open } = this.state;
    if (open) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  onKeyDown(event) {
    event.stopPropagation();
    const { loading } = this.state;
    if (!loading) {
      if (event.keyCode === 32) {
        // space
        this.trigger();
      }
      if (event.keyCode === 65) {
        // a
        this.postChangeThreshold();
      }
      if (event.keyCode === 82) {
        // r
        this.getLeadsheetVaeRandom();
      }
    }
  }

  changeTableIndex(currentTableIndex) {
    this.sound.changeTable(this.matrix[currentTableIndex]);
    this.setState({
      currentTableIndex,
    });
  }

  openMenu() {
    document.getElementById('menu').style.height = '100%';
    this.setState({
      open: true,
    });
  }

  closeMenu() {
    document.getElementById('menu').style.height = '0%';
    this.setState({
      open: false,
    });
  }

  handleChangeRhythmThresholdValue(e) {
    const rhythmThreshold = e.target.value / 100;
    // console.log(`rhythmThreshold changed: ${rhythmThreshold}`);
    this.setState({ rhythmThreshold });
  }

  handleSendPostRhythmThresholdValue(amt) {
    this.postChangeThreshold(amt);
    console.log(`threshold: ${amt}`);
  }

  handleChangeBpmValue(e) {
    const v = e.target.value;
    // 0~100 -> 60~120
    const bpm = v;
    // console.log(`bpm changed: ${bpm}`);
    this.setState({ bpm });
    this.sound.changeBpm(bpm);
  }

  handleClickPlayButton() {
    this.trigger();
  }

  trigger() {
    const playing = this.sound.trigger();
    this.renderer.playing = playing;
    this.setState({
      playing,
    });
  }

  start() {
    this.sound.start();
    this.renderer.playing = true;
    this.setState({
      playing: true,
    });
  }

  stop() {
    this.sound.stop();
    this.renderer.playing = false;
    this.setState({
      playing: false,
    });
  }

  onPlay() {
    // console.log('press play!');

    const id = 'splash';
    const splash = document.getElementById(id);
    splash.style.opacity = 0.0;
    setTimeout(() => {
      splash.style.display = 'none';
      this.setState({
        slash: false,
      });
    }, 500);
  }

  render() {
    const { loading, instructionStage, songs } = this.state;
    const loadingText = loading ? 'loading...' : 'play';
    const arr = Array.from(Array(9).keys());
    const mat = Array.from(Array(9 * 16).keys());
    const { rhythmThreshold, bpm } = this.state;
    const songsString = `${songs[0].substring(0, songs[0].length - 5)} → ${songs[1].substring(0, songs[1].length - 5)}`;
    return (
      <div>
        <section className={styles.splash} id="splash">
          <div className={styles.wrapper}>
            <h1>🎛<br />Song<br />Mixer</h1>
            <h2>
              = melody + chords + mix
            </h2>
            <div className="device-supported">
              <p className={styles.description}>
                An interactive demo of a musical machine learning algorithm
                which can interpolate between different songs (melody + chords).
              </p>

              <button
                className={styles.playButton}
                id="splash-play-button"
                onClick={() => this.onPlay()}
              >
                {loadingText}
              </button>

              <p className={styles.builtWith}>
                Built with tone.js + Flask.
                <br />
                Learn more about <a className={styles.about} target="_blank" href="https://github.com/vibertthio/drum-vae-client">how it works.</a>
              </p>

              <p>Made by</p>
              <img className="splash-icon" src={sig} width="100" height="auto" alt="Vibert Thio Icon" />
            </div>
          </div>
          <div className={styles.badgeWrapper}>
            <a className={styles.magentaLink} href="http://musicai.citi.sinica.edu.tw/" target="_blank" >
              <div>Music and AI Lab</div>
            </a>
          </div>
          <div className={styles.privacy}>
            <a href="https://github.com/vibertthio/drum-vae-client" target="_blank">Privacy &amp; </a>
            <a href="https://github.com/vibertthio/drum-vae-client" target="_blank">Terms</a>
          </div>
        </section>
        <div className={styles.title}>
          <div className={styles.link}>
            <a href="https://github.com/vibertthio" target="_blank" rel="noreferrer noopener">
              Song Mixer
            </a>
          </div>
          <button
            className={styles.btn}
            onClick={() => this.handleClickMenu()}
            onKeyDown={e => e.preventDefault()}
          >
            <img alt="info" src={info} />
          </button>
          <div className={styles.tips} id="tips">
            {instructionStage < 2 ? <p>{songsString}</p> : ''}
            {/* {instructionStage === 0 ? (<p>👇The <font color="#00b894">blinking square</font> indicate the different ratio of the mixed melody</p>) : ''} */}
          </div>
        </div>
        <div>
          {this.state.loading && (
            <div className={styles.loadingText}>
              <p>{loadingText}</p>
            </div>
          )}
        </div>
        <div>
          <canvas
            ref={ c => this.canvas = c }
            className={styles.canvas}
            width={this.state.screen.width * this.state.screen.ratio}
            height={this.state.screen.height * this.state.screen.ratio}
          />
        </div>
        <div className={styles.control}>
          <div className={styles.slider}>
            <input
              type="range"
              min="1"
              max="99"
              value={rhythmThreshold * 100}
              onMouseUp={() => this.handleSendPostRhythmThresholdValue(rhythmThreshold)}
              onChange={this.handleChangeRhythmThresholdValue.bind(this)}
            />
            <button onClick={this.handleClickPlayButton.bind(this)} onKeyDown={e => e.preventDefault()}>
              {
                !this.state.playing ?
                  (<img src={playSvg} width="30" height="30" alt="submit" />) :
                  (<img src={pauseSvg} width="30" height="30" alt="submit" />)
              }
            </button>
            <button onClick={() => this.getLeadsheetVaeRandom()} onKeyDown={e => e.preventDefault()}>
              <img src={shufflePng} width="25" height="25" alt="shuffle" />
            </button>
            <input type="range" min="60" max="180" value={bpm} onChange={this.handleChangeBpmValue.bind(this)}/>
          </div>
        </div>
        {/* <div className={styles.foot}>
          <a href="https://vibertthio.com/portfolio/" target="_blank" rel="noreferrer noopener">
            Vibert Thio
          </a>
        </div> */}
        <div id="menu" className={styles.overlay}>
          <button className={styles.overlayBtn} onClick={() => this.handleClickMenu()} />
          <div className={styles.intro}>
            <p>
              <strong>$ Song Mashup $</strong>
              <br />An interactive demo of a musical machine learning
              algorithm which can interpolate between different songs (melody + chords). Made by{' '}
              <a href="https://vibertthio.com/portfolio/" target="_blank" rel="noreferrer noopener">
                Vibert Thio
              </a>.{' Source code is on '}
              <a
                href="https://github.com/vibertthio"
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub.
              </a>
            </p>
            <p>
              <strong>$ How to use $</strong>
              <br /> [space]: start/play the music
              <br /> [clikc]: click on grids, to change interpolation
              <br /> [r] : change the melody
            </p>
          </div>
          <button className={styles.overlayBtn} onClick={() => this.handleClickMenu()} />
        </div>
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));
