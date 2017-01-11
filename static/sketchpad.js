// Based on: https://github.com/yiom/sketchpad
class Sketchpad {
  constructor(options, fireRef) {
    // Support both old api (element) and new (canvas)
    options.canvas = options.canvas || options.element;
    if (!options.canvas) {
      console.error('[SKETCHPAD]: Please provide an element/canvas:');
        return;
    }

    if (typeof options.canvas === 'string') {
      options.canvas = document.querySelector(options.canvas);
    }

    this.canvas = options.canvas;

    // Try to extract 'width', 'height', 'color', 'penSize' and 'readOnly'
    // from the options or the DOM element.
    ['width', 'height', 'color', 'penSize', 'readOnly'].forEach(function(attr) {
      this[attr] = options[attr] || this.canvas.getAttribute('data-' + attr);
    }, this);

    // Setting default values
    this.background = options.background || '';
    this.width = this.width || 0;
    this.height = this.height || 0;

    this.color = this.color || '#000';
    this.penSize = this.penSize || 5;

    this.readOnly = this.readOnly || false;

    // Firebase
    this.fireRef = fireRef;

    // Stroke reference overwrite
    this.strokes = {
      'push': function(data) {
        return fireRef.child('strokes').push(data);
      },
      'pop': function(cb) {
        // fetch last child, http://jsfiddle.net/polmoneys/bPkDD/
        return fireRef.child('strokes').limitToLast(1).once("child_added", function (snapshot) {
          return fireRef.child('strokes').child(snapshot.key()).remove(function() {
            cb(snapshot.val());
          });
        });
      }
    };

    // Sketchpad History settings
    this.undoHistory = options.undoHistory || [];

    // Enforce context for Moving Callbacks
    this.onMouseMove = this.onMouseMove.bind(this);

    // Setup Internal Events
    this.events = {};
    this.events['mousemove'] = [];
    this.internalEvents = ['MouseDown', 'MouseUp', 'MouseOut'];
    this.internalEvents.forEach(function(name) {
      let lower = name.toLowerCase();
      this.events[lower] = [];

      // Enforce context for Internal Event Functions
      this['on' + name] = this['on' + name].bind(this);

      // Add DOM Event Listeners
      this.canvas.addEventListener(lower, (...args) => this.trigger(lower, args));
    }, this);

    this.reset();
  }

  /*
   * Private API
   */

  _position(event) {
    return {
      x: event.pageX - this.canvas.offsetLeft,
      y: event.pageY - this.canvas.offsetTop,
    };
  }

  _stroke(stroke) {
    if (stroke.type === 'clear') {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (stroke.lines){
      stroke.lines.forEach(function(line) {
        this._line(line.start, line.end, stroke.color, stroke.size);
      }, this);
    }
  }

  _draw(start, end, color, size) {
    this._line(start, end, color, size, 'source-over');
  }

  _erase(start, end, color, size) {
    this._line(start, end, color, size, 'destination-out');
  }

  _line(start, end, color, size, compositeOperation) {
    this.context.save();
    this.context.lineJoin = 'round';
    this.context.lineCap = 'round';
    this.context.strokeStyle = color;
    this.context.lineWidth = size;
    this.context.globalCompositeOperation = compositeOperation;
    this.context.beginPath();
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(end.x, end.y);
    this.context.closePath();
    this.context.stroke();
    this.context.restore();
  }

  /*
   * Events/Callback
   */

  onMouseDown(event) {
    this._sketching = true;
    this._lastPosition = this._position(event);
    this._currentStroke = {
      color: this.color,
      size: this.penSize,
      lines: [],
    };

    this.canvas.addEventListener('mousemove', this.onMouseMove);
  }

  onMouseUp(event) {
    if (this._sketching) {
      if (this._currentStroke.lines) {
        this.strokes.push(this._currentStroke);
      }
      this._sketching = false;
    }
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
  }

  onMouseOut(event) {
    this.onMouseUp(event);
  }

  onMouseMove(event) {
    let currentPosition = this._position(event);
    this._draw(this._lastPosition, currentPosition, this.color, this.penSize);
    this._currentStroke.lines.push({
      start: this._lastPosition,
      end: currentPosition,
    });
    this._lastPosition = currentPosition;

    this.trigger('mousemove', [event]);
  }

  /*
   * Public API
   */

  toObject() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
      strokes: this.strokes,
      undoHistory: this.undoHistory,
    };
  }

  toJSON() {
    return JSON.stringify(this.toObject());
  }

  redo() {
    var stroke = this.undoHistory.pop();
    if (stroke) {
      this.strokes.push(stroke);
      this._stroke(stroke);
    }
  }

  undo() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.strokes.pop(function(stroke) {
      this.redraw();
      if (stroke) {
        this.undoHistory.push(stroke);
      }
    }.bind(this));
  }

  clear() {
    this.strokes.push({
      type: 'clear',
    });
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  redraw() {
    this.fireRef.child('strokes').once("value", function(snapshot) {
      var strokes = snapshot.val();
      $.each(strokes, function(key, value) {
        this._stroke(value);
      }.bind(this));
    }.bind(this));
  }

  addBackground(url) {
    this.canvas.style.background = ("url(" + url + ") no-repeat");
    this.canvas.style.backgroundSize = 'contain';
  }

  reset() {
    // Setup canvas
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext('2d');
    if (!(this.context)) {
      throw 'Your browser does not support canvas :\(';
    }
    if (this.background) {
      this.addBackground(this.background);
    }
    // Redraw image
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear for watchers

    this.fireRef.child('strokes').on("child_added", function(snapshot) {
      var stroke = snapshot.val();
      this._stroke(stroke);
    }.bind(this));

    this.fireRef.child('strokes').on("child_removed", function(snapshot) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.redraw();
    }.bind(this));

    // Remove all event listeners, this way readOnly option will be respected
    // on the reset
    this.internalEvents.forEach(name => this.off(name.toLowerCase()));

    if (this.readOnly) {
      return;
    }

    // Re-Attach all event listeners
    this.internalEvents.forEach(name => this.on(name.toLowerCase(), this['on' + name]));
  }

  cancelAnimation() {
    this.animateIds = this.animateIds || [];
    this.animateIds.forEach(function(id) {
      clearTimeout(id);
    });
    this.animateIds = [];
  }

  animate(interval=10, loop=false, loopInterval=0) {
    let delay = interval;

    this.cancelAnimation();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.fireRef.child('strokes').once('value', function(snapshot) {
      var strokes = snapshot.val();
      $.each(strokes, function(key, stroke) {
        if (stroke.type === 'clear') {
          delay += interval;
          return this.animateIds.push(setTimeout(() => {
            this.context.clearRect(0, 0, this.canvas.width,
                                   this.canvas.height);
          }, delay));
        }
        if (stroke.lines) {
          stroke.lines.forEach(line => {
            delay += interval;
            this.animateIds.push(setTimeout(() => {
              this._draw(line.start, line.end, stroke.color, stroke.size);
            }, delay));
          });
        }
      }.bind(this));
    }.bind(this));

    if (loop) {
      this.animateIds.push(setTimeout(() => {
        this.animate(interval=10, loop, loopInterval);
      }, delay + interval + loopInterval));
    }
  }

  /*
   * Event System
   */

  /* Attach an event callback
   *
   * @param {String} action Which action will have a callback attached
   * @param {Function} callback What will be executed when this event happen
   */
  on(action, callback) {
    // Tell the user if the action he has input was invalid
    if (this.events[action] === undefined) {
      return console.error(`Sketchpad: No such action '${action}'`);
    }

    this.events[action].push(callback);
  }

  /* Detach an event callback
   *
   * @param {String} action Which action will have event(s) detached
   * @param {Function} callback Which function will be detached. If none is
   *                            provided, all callbacks are detached
   */
  off(action, callback) {
    if (callback) {
      // If a callback has been specified delete it specifically
      var index = this.events[action].indexOf(callback);
      (index !== -1) && this.events[action].splice(index, 1);
      return index !== -1;
    }

    // Else just erase all callbacks
    this.events[action] = [];
  }

  /* Trigger an event
   *
   * @param {String} action Which event will be triggered
   * @param {Array} args Which arguments will be provided to the callbacks
   */
  trigger(action, args=[]) {
    // Fire all events with the given callback
    this.events[action].forEach(function(callback) {
      callback(...args);
    });
  }
}

window.Sketchpad = Sketchpad;
