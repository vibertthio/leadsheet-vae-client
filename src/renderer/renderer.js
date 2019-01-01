import PianorollGrid from './pianoroll-grid';
import { Noise } from 'noisejs';
import { lerpColor, roundedRect } from './../utils/utils';

export default class Renderer {
  constructor(app, canvas) {
    this.app = app;
    this.canvas = canvas;
    this.matrix = [];
    this.chords = [];
    this.pianorollGrids = [];
    this.dist = 0;
    this.beat = 0;
    this.fontSize = 1.0;
    this.playing = false;

    this.frameCount = 0;
    this.halt = false;

    // colors
    // this.backgroundColor = 'rgba(15, 15, 15, 1.0)';
    this.backgroundColor = '#0d0d0d';
    this.noteOnColor = 'rgba(255, 255, 255, 1.0)';
    this.mouseOnColor = 'rgba(150, 150, 150, 1.0)';
    this.noteOnCurrentColor = 'rgba(255, 100, 100, 1.0)';
    this.darkColor = 'rgba(30, 30, 30, 1.0)';
    this.whiteColor = '#ffffff';
    this.greenColor = '#00b894';

    this.extendAlpha = 0;
    this.currentUpdateDir = 0;
    this.selectedLatent = 20;
    this.displayWidth = 0;
    this.interpolationXShift = 0;
    this.h = 0;
    this.mouseOnInterpolation = -1;

    this.pianorollGrids[0] = new PianorollGrid(this,  -1.5, 0);
    this.pianorollGrids[1] = new PianorollGrid(this,  0);
    this.pianorollGrids[2] = new PianorollGrid(this,  1.5, 8);

    this.noise = new Noise(Math.random());

    // interpolation display
    this.h_step = 0;

    // instruction
    this.endOfSection = false;
    this.instructionState = 0;


    this.initMatrix();
  }

  initMatrix() {
    this.matrix = new Array(9).fill(new Array(4).fill(new Array(48).fill(-1)));
  }

  changeMatrix(mat) {
    this.halt = false;
    this.matrix = mat;
    this.pianorollGrids[2].changeFixed(this.matrix.length - 1);
  }

  draw(scr, sectionIndex = 0, barIndex = 0, b = 0) {

    if (!this.endOfSection) {
      if ((b % 192) > 188) {
        this.endOfSection = true;
        console.log('end of section');
        if (this.instructionState === 0) {
          if (this.sectionIndex === 0) {
            this.changeInstructionState(1);
          }
        } else if (this.instructionState === 1) {
          if (this.sectionIndex === this.matrix.length - 1) {
            this.changeInstructionState(2);
          }
        }
      }
    } else if (this.endOfSection) {
      if ((b % 192) < 4) {
        this.endOfSection = false;
      }
    }

    this.frameCount += 1;
    this.beat = b;

    this.sectionIndex = sectionIndex;
    const ctx = this.canvas.getContext('2d');
    // ctx.font = this.fontSize.toString() + 'rem monospace';
    this.width = scr.width;
    this.height = scr.height;
    const width = scr.width;
    const height = scr.height;

    ctx.save();
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const h = height * 0.18;
    const w = Math.min(700, width * 0.5);
    // console.log(`w: ${w}`);
    this.h = h;
    this.displayWidth = w;
    this.interpolationXShift = w * 0.55;
    this.dist = h * 1.2;
    this.setFontSize(ctx, Math.pow(w / 800, 0.4));

    ctx.translate(width * 0.5, height * 0.5);

    this.pianorollGrids[0].draw(ctx, w, h);
    this.pianorollGrids[1].draw(ctx, w * 0.9, h * 1.2);
    this.pianorollGrids[2].draw(ctx, w, h);

    this.drawInterpolation(ctx, w * 0.12, h);
    ctx.restore();
  }

  drawInterpolation(ctx, w, h) {
    ctx.save();
    ctx.translate(-(this.interpolationXShift), 0);
    let breathRatio = 1 + Math.sin(this.frameCount * 0.08) * 0.03;
    if (this.instructionState < 3) {
      breathRatio = 1;
    }
    const frameW = w * 0.9 * breathRatio;
    const frameH = h * 1.2 * 1.1 * breathRatio;
    this.drawFrame(ctx, frameW, frameH);
    const h_step = (h / this.matrix.length) * 1.2;
    this.h_step = h_step;


    // text
    const ratio = 0.13;
    if (this.instructionState === 3) {
      ctx.save();
      ctx.translate(-w * 0.5, 0);
      ctx.fillStyle = this.whiteColor;
      ctx.textAlign = 'end';
      // ctx.fillText('Press the squares', 0, -2 * h * ratio);
      // ctx.fillText('listen to the', 0, -h * ratio);
      // ctx.fillText('different ratio', 0, 0);
      // ctx.fillText('in mixing of', 0, h * ratio);
      // ctx.fillText('the two songs', 0, 2 * h * ratio);
      ctx.restore();
    } else if (this.instructionState < 2) {
      // ctx.save();
      // ctx.translate(-w * 0.5, 0);
      // ctx.fillStyle = this.whiteColor;
      // ctx.textAlign = 'end';
      // ctx.fillText('The blinking square\'s', 0, -2 * h * ratio);
      // ctx.fillText('position indicate the', 0, -h * ratio);
      // ctx.fillText('different ratio', 0, 0);
      // ctx.fillText('in mixing of', 0, h * ratio);
      // ctx.fillText('the two songs', 0, 2 * h * ratio);
      // ctx.restore();
    }

    // start drawing
    const rectW = Math.min(w * 0.4, 45);
    ctx.translate(-0.5 * rectW, 0);
    for (let i = 0; i < this.matrix.length; i += 1) {
      ctx.save();
      const j = i - (this.matrix.length / 2);
      ctx.translate(0, h_step * (j + 0.25));
      ctx.fillStyle = this.darkColor;
      if (i === this.mouseOnInterpolation) {
        ctx.fillStyle = this.greenColor;
      } else if (i === this.sectionIndex) {
        const lerpRatio = Math.pow(Math.sin(this.frameCount * 0.05), 2);
        ctx.fillStyle = lerpColor(this.backgroundColor, this.greenColor, lerpRatio);
      }
      // ctx.fillRect(0, 0, w * 0.4, h_step * 0.5);
      roundedRect(ctx, 0, 0, rectW, h_step * 0.5, 5);

      ctx.restore();
    }


    ctx.restore();
  }

  handleInterpolationClick(x, y) {
    const xpos = x + (this.interpolationXShift);
    const ypos = y;
    // console.log(`x: ${xpos}, y: ${ypos}`);
    if (Math.abs(xpos) < this.displayWidth * 0.1) {
      const even = ((this.matrix.length % 2) === 0) ? 0 : 0.5;
      const index = Math.floor((ypos / this.h_step) + even) + Math.floor(this.matrix.length / 2);
      if (index >= 0 && index < this.matrix.length) {
        // console.log(`click index: [${index}]`);
        this.sectionIndex = index;
        return true;
      }
      return false;
    }
    return false;
  }

  handleMouseDownOnPianoroll(x, y) {
    if (Math.abs(this.pianorollGrids[0].gridYShift - y) < this.h * 0.5) {
      if (this.instructionState === 0) {
        this.pianorollGrids[0].showingInstruction = false;
      }
      return 0;
    } else if (Math.abs(this.pianorollGrids[2].gridYShift - y) < this.h * 0.5) {
      if (this.instructionState === 0) {
        return -1;
      } else if (this.instructionState === 1) {
        this.pianorollGrids[2].showingInstruction = false;
      }
      return 2;
    } else if (Math.abs(y) < this.h * 0.5) {
      if (this.instructionState === 2) {
        this.instructionState = 3;
        this.pianorollGrids[1].showingInstruction = false;
        this.sectionIndex = 0;
        return 1;
      } else if (this.instructionState === 3) {
        // this.sectionIndex = 0;
        return 3;
      } else if (this.instructionState === 4) {
        // this.sectionIndex = 0;
        return 3;
      }
      return -1;
    }

    return -1;
  }

  handleMouseDown(e) {
    let cx = e.clientX - this.width * 0.5;;
    let cy = e.clientY - this.height * 0.5;

    const onInterpolation = this.handleInterpolationClick(cx, cy);
    const onPianoroll = this.handleMouseDownOnPianoroll(cx, cy)

    if (onInterpolation && (this.instructionState === 3)) {
      this.instructionState = 4;
    }

    return [
      onInterpolation,
      onPianoroll,
    ];
  }

  handleMouseMove(e) {
    const x = e.clientX - (this.width * 0.5);
    const y = e.clientY - (this.height * 0.5);

    const xpos = x + (this.interpolationXShift);
    const ypos = y;
    if (Math.abs(xpos) < this.displayWidth * 0.1) {
      const even = ((this.matrix.length % 2) === 0) ? 0 : 0.5;
      const index = Math.floor((ypos / this.h_step) + even) + Math.floor(this.matrix.length / 2);
      if (index >= 0 && index < this.matrix.length) {
        // console.log(`click index: [${index}]`);
        this.mouseOnInterpolation = index;
      }
    } else {
      this.mouseOnInterpolation = -1;
    }

  }

  // instruction
  changeInstructionState(s) {
    this.instructionState = s;
    if (s === 1) {
      this.pianorollGrids[0].showingInstruction = false;
      this.pianorollGrids[1].showingInstruction = false;
      this.pianorollGrids[2].showingInstruction = true;
    } else if (s === 2) {
      this.pianorollGrids[0].showingInstruction = false;
      this.pianorollGrids[2].showingInstruction = false;
      this.pianorollGrids[1].showingInstruction = true;
    }
  }

  // draw frame
  drawFrame(ctx, w, h) {
    const unit = this.dist * 0.04;

    ctx.save();

    ctx.strokeStyle = '#FFF';

    ctx.beginPath()
    ctx.moveTo(0.5 * w, 0.5 * h - unit);
    ctx.lineTo(0.5 * w, 0.5 * h);
    ctx.lineTo(0.5 * w - unit, 0.5 * h);
    ctx.stroke();

    ctx.beginPath()
    ctx.moveTo(-0.5 * w, 0.5 * h - unit);
    ctx.lineTo(-0.5 * w, 0.5 * h);
    ctx.lineTo(-0.5 * w + unit, 0.5 * h);
    ctx.stroke();

    ctx.beginPath()
    ctx.moveTo(0.5 * w, -0.5 * h + unit);
    ctx.lineTo(0.5 * w, -0.5 * h);
    ctx.lineTo(0.5 * w - unit, -0.5 * h);
    ctx.stroke();

    ctx.beginPath()
    ctx.moveTo(-0.5 * w, -0.5 * h + unit);
    ctx.lineTo(-0.5 * w, -0.5 * h);
    ctx.lineTo(-0.5 * w + unit, -0.5 * h);
    ctx.stroke();

    ctx.restore();
  }

  setFontSize(ctx, amt) {
    this.fontSize = amt;
    ctx.font = this.fontSize.toString() + 'rem monospace';
  }

  // animation
  triggerStartAnimation() {
    this.pianorollGrids.forEach(p => p.triggerStartAnimation());
  }

}
