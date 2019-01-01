import { lerpColor, roundedRect } from '../utils/utils';

export default class PianorollGrid {

  constructor(renderer, ysr = -1.5, fixed = -1) {
    this.matrix = [];
    this.noteList = [];
    this.renderer = renderer;
    this.fixed = fixed;
    this.sectionIndex = fixed;
    this.frameRatio = 1.1;

    this.gridWidth = 0;
    this.gridHeight = 0;
    this.gridXShift = 0;
    this.gridYShift = 0;

    this.darkColor = 'rgba(30, 30, 30, 1.0)';
    this.whiteColor = '#ffffff';
    this.greenColor = '#00b894';

    this.yShiftRatio = ysr;

    // animation
    this.currentNoteIndex = -1;
    this.currentNoteYShift = 0;
    this.currentChordIndex = -1;
    this.currentChordYShift = 0;
    this.newSectionYShift = 1;

    // instruction
    this.showingInstruction = false;
  }

  update(w, h) {
    const { matrix, beat, sectionIndex } = this.renderer;
    if (this.matrix !== matrix) {
      this.matrix = matrix;
      this.decodeMatrix(this.matrix);
    }
    if (this.fixed === -1) {
      this.beat = beat;
      if (this.sectionIndex !== sectionIndex) {
        this.sectionIndex = sectionIndex;
        this.triggerStartAnimation();
      }
    } else {
      this.beat = beat;
    }

    this.gridWidth = w;
    this.gridHeight = h;
    this.gridYShift = h * this.yShiftRatio;
  }

  decodeMatrix(mat) {
    let noteList = new Array(mat.length).fill([]).map((l, i) => {
      let list = [];
      let noteOn = false;
      let currentNote = -1;
      let currentStart = 0;
      let currentEnd = 0;
      // flatten
      let section = [].concat.apply([], mat[i].slice()).forEach((note, j) => {
        if (note !== currentNote) {

          // current note end
          if (noteOn && currentNote !== -1) {
            currentEnd = j - 1;
            list = list.concat([[currentNote, currentStart, currentEnd]]);
          }

          currentNote = note;

          // new note start
          if (note !== -1) {
            noteOn = true;
            currentStart = j;
          }
        } else if ((j === (mat[0][0].length * mat[0].length - 1)) && note !== -1) {
          // last one
          currentEnd = j;
          list = list.concat([[currentNote, currentStart, currentEnd]])
        }
      });
      return list;
    });
    this.noteList = noteList;
    // console.log('original matrix');
    // console.log(mat);
    // console.log('decoded');
    // console.log(noteList);
  }

  draw(ctx, w, h) {
    this.update(w, h)
    this.updateYShift();

    ctx.save();
    ctx.translate(this.gridXShift, this.gridYShift)

    if (this.fixed === -1) {
      ctx.translate(
        this.frameRatio * (this.renderer.displayWidth - w) * 0.5,
        0);
    }

    this.drawFrame(
      ctx,
      this.gridWidth * this.frameRatio,
      this.gridHeight * this.frameRatio,
    );

    ctx.save();
    ctx.translate(-w * 0.5, -h * 0.5);


    // roll
    const wStep = w / (48 * 4);
    const b = this.beat % 192;
    // console.log(this.fixed);
    // console.log(this.renderer.chords);

    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.translate((48 * i) * wStep, 25);
      if (this.renderer.chords.length > 0) {
        const chords = this.renderer.chords[this.sectionIndex][i]
        let prevC = '';
        chords.forEach((c, j) => {
          const pos = 48 * i + 12 * j;
          ctx.save();
          if (b > pos && b < (pos + 12) && this.checkCurrent()) {
            if (this.currentChordIndex !== pos) {
              this.currentChordIndex = pos;
              this.currentChordYShift = 1;
            }
            ctx.translate(0, this.currentChordYShift * -5);
            ctx.fillStyle = this.greenColor;
          } else {
            ctx.fillStyle = this.whiteColor;
          }
          if (c !== prevC) {
            ctx.fillText(c, 5, -8);
          } else {
            ctx.fillText('-', 5, -8);
          }
          ctx.restore();
          ctx.translate(12 * wStep, 0)
          prevC = c;
        })
      }
      ctx.restore();
    }

    const hStep = h / 48;

    this.noteList[this.sectionIndex].forEach((item, index) => {
      const [note, start, end] = item;
      const y = 48 - (note - 48);
      let wStepDisplay = wStep * (1 - this.newSectionYShift);
      ctx.save();
      ctx.strokeStyle = 'none';
      ctx.translate(start * wStep, y * hStep);

      if ((b % 192) >= start
        && (b % 192) <= end
        && this.checkCurrent()
        && this.isPlaying()) {
        if (this.currentNoteIndex !== index) {
          // change note
          this.currentNoteYShift = 1;
          this.currentNoteIndex = index;
        }
        ctx.fillStyle = this.whiteColor;
        ctx.fillText(note, 5, -8);
        ctx.fillStyle = this.greenColor;
        ctx.translate(0, this.currentNoteYShift * -2);
        // stretch
        // wStepDisplay *= (1 + this.currentNoteYShift * 0.1)
      } else {
        ctx.fillStyle = this.whiteColor;
      }

      ctx.fillRect(0, 0, wStepDisplay * (end - start + 1), hStep);


      ctx.restore();
    });

    // progress
    if ((this.fixed === -1 || this.checkCurrent())
      && (this.isPlaying() || b > 0)) {
      ctx.translate((b % 192) * wStep, 0);
      ctx.strokeStyle = this.greenColor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, h);
      ctx.stroke();
    }

    if (this.fixed === 0) {

    }
    ctx.restore();

    this.drawBling(
      ctx,
      this.gridWidth * this.frameRatio - 15,
      this.gridHeight * this.frameRatio - 12,
    );
    this.drawInstructionText(ctx, h, w);



    ctx.restore();
  }

  isPlaying() {
    return this.renderer.playing;
  }

  checkCurrent() {
    return (this.renderer.sectionIndex === this.fixed) || (this.fixed === -1);
  }

  updateYShift() {
    this.currentNoteYShift *= 0.9;
    this.currentChordYShift *= 0.9;
    this.newSectionYShift *= 0.9;
  }

  triggerStartAnimation() {
    this.newSectionYShift = 1;
  }

  drawFrame(ctx, w, h) {
    const unit = this.renderer.dist * 0.04;

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

  drawBling(ctx, w, h) {
    if (this.showingInstruction) {
      const width = w * 0.3;
      const height = h * 0.35;
      ctx.save();
      ctx.translate(-0.5 * width, -0.5 * height);
      ctx.fillStyle = this.darkColor;
      roundedRect(ctx, 0, 0, width, height, 5);
      ctx.restore();
    }
  }

  drawInstructionText(ctx, w, h) {
    if (this.showingInstruction) {
      ctx.save();
      ctx.textAlign = 'center';
      const ratio = 0.014;
      const ratioMiddle = ratio * 2.5;

      if (this.fixed === 0) {
        ctx.fillStyle = lerpColor(
          this.whiteColor,
          this.greenColor,
          Math.pow(
            Math.sin(this.renderer.frameCount * 0.03),
            2,
          ),
        );
        ctx.fillText('Press here!', 0, -h * ratio);
        ctx.fillStyle = this.whiteColor;
        ctx.fillText('Listen to the first song', 0, h * ratio);
      } else if (this.fixed === this.matrix.length - 1) {
        ctx.fillStyle = lerpColor(
          this.whiteColor,
          this.greenColor,
          Math.pow(
            Math.sin(this.renderer.frameCount * 0.05),
            2,
          ),
        );
        ctx.fillText('Press here!', 0, -h * ratio);
        ctx.fillStyle = this.whiteColor;
        ctx.fillText('Listen to the second song', 0, h * ratio);
      } else if (this.fixed === -1) {
        ctx.fillStyle = lerpColor(
          this.whiteColor,
          this.greenColor,
          Math.pow(
            Math.sin(this.renderer.frameCount * 0.05),
            2,
          ),
        );
        ctx.fillText('Press here!', 0, -h * ratioMiddle);
        ctx.fillStyle = this.whiteColor;
        ctx.fillText('Listen to the mixing of two melodies', 0, 0);
        // ctx.fillText('', 0, h * ratioMiddle);
      }

      ctx.restore();
    }
  }

  changeFixed(i) {
    this.fixed = i;
    this.sectionIndex = i;
  }


}
