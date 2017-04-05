// states markers, order matters
const STATES = ['empty', 'dragin', 'dropped', 'leaved'], // states applied immidately
      MID_STATES = ['reset', 'delete']; // states applied when mouse end

/* ---- HELPERS ---- */
function setPos(target, x, y) {
  // set target to x, y pos
  target.style.webkitTransform =
  target.style.transform =
    'translate(' + x + 'px, ' + y + 'px)';
  // update the position attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

function cloneTarget(target) {
  // clone the target and return the clone reference
  var clone = target.cloneNode(true);
  var par = target.parentNode;
  par.insertBefore(clone, par.childNodes[0]);
  return clone;
}

function determineState(target) {
  /* determine target state, in priority order
  */
  var classList = target.classList;
  for (i=0; i<STATES.length; i++) {
    if (classList.contains(STATES[i])) {
      return STATES[i];
    }
  }
  for (i=0; i<MID_STATES.length; i++) {
    if (classList.contains(MID_STATES[i])) {
      return 'MID';
    }
  }
  throw('undetermined: ' + classList);
}

function hasState(target, state) {
  return target.classList.contains(state);
}

function setState(target, state) {
  // add classList and set content
  target.classList.add(state);
  target.textContent = '#' + state;
}

// -- Droppable Coordinators --
/*
  Life cycle of the droppable:
  start from init: initial -> dragin -> dropped
  start from dropped: dropped -> dropped & dragin -> dragout

  Note: droppable is consistant across all state, acceptable by dropzone.
*/

function draginToDropped(target) {
  // lifecycle coordinator: dragin -> dropped
  target.classList.remove('dragin');
  setState(target, 'dropped');
}

function droppableReset(target) {
  // reset a droppable element (cloned) to initial state
  // lifecycle coordinator: dropped -> droppable
  setPos(target, 0, 0);
  target.classList.remove('dropped', 'dragin', 'reset');
  target.classList.add('empty');
  setState(target, 'droppable');
}

function droppableDelete(target) {
  // lifecycle coordinator:
  interact(target).unset();
  target.remove();
}

/* -- LOADERS -- */
$(document).ready(function() {
  // GENERAL
  if (typeof background === 'undefined') {
    background = '';
  }
  if (typeof fireUrl === 'undefined') {
    throw 'Panic: fireUrl needs to setup, look at static/settings_sample.js for more info'
  }
  var sketchpad = new Sketchpad({
    element: '#sketchpad',
    width: 400,
    height: 400,
    background: background
  }, new Firebase(fireUrl).child('drawing'));
  sketchpad.color = '#FF0000';
  sketchpad.penSize = 10;

  // buttons
  $( "#animate" ).click(function() {
    sketchpad.animate();
  });

  $( "#redo" ).click(function() {
    sketchpad.redo();
  });

  $( "#undo" ).click(function() {
    sketchpad.undo();
  });
  /* END of General */

  // target elements with the "draggable" class
  interact('.draggable')
  .draggable({
    // enable inertial throwing
    inertia: true,
    // keep the element within the area of it's parent
    // this is cancelled since libary bug
    /*
    restrict: {
      restriction: "parent",
      endOnly: true,
      elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
    },
    */
    // enable autoScroll
    autoScroll: true,
    // call this function on every dragmove event
    onmove: dragMoveListener,
    // call this function on every dragend event
    onend: function (event) {
      // check and deal with delayed state
      if (hasState(event.target, 'delete')) {
        // delete this element
        droppableDelete(event.target);
      }
      if (hasState(event.target, 'reset') || hasState(event.target, 'empty')) {
        droppableReset(event.target);
      }
    }
  });

  function dragMoveListener (event) {
    // translate the element
    setPos(event.target,
            ((parseFloat(event.target.getAttribute('data-x')) || 0) + event.dx),
            ((parseFloat(event.target.getAttribute('data-y')) || 0) + event.dy))
  }

  // enable draggables to be dropped into this
  interact('.dropzone').dropzone({
    // only accept elements matching this CSS selector
    accept: '.droppable',
    // Require a 75% element overlap for a drop to be possible
    overlap: 0.75,

    // listen for drop related events:
    ondropactivate: function (event) {
      // add active dropzone feedback
      event.target.classList.add('drop-active');
    },
    ondragenter: function (event) {
      var target = event.relatedTarget,
          dropzoneElement = event.target;

      // feedback the possibility of a drop
      dropzoneElement.classList.add('drop-target');
      // draggable is droppable, since only accept droppable element

      // @@ Train checker: drag in
      switch (determineState(target)) {
        case 'empty':
          target.classList.remove('empty');
          break;
        case 'dropped':
          // no action required: keeps dropped state
          break;
        case 'leaved':
          target.classList.remove('leaved');
          break;
        case 'MID':
          // remove all middle state
          target.classList.remove('delete', 'reset');
          break;
        default:
          throw('Panic, no action mapped');
      }
      // clear all mid states
      target.classList.remove('delete', 'reset');
      // add dragin state
      setState(target, 'dragin')
    },
    ondragleave: function (event) {
      // basic
      event.target.classList.remove('drop-target');
      event.target.classList.remove('can-drop');
      event.relatedTarget.classList.remove('dragin');
      // delayed state
      if (hasState(event.relatedTarget, 'dropped')) { // just drag out
        // presist dropped state, mark as delete, wait for mouse event end
        setState(event.relatedTarget, 'delete');
      }
      else { // drag in and out
        // mark as reset, wait for mouse event end
        setState(event.relatedTarget, 'reset');
      }
    },
    ondrop: function (event) {
      if (!hasState(event.relatedTarget, 'dropped')) { // only if not dropped already
        var clone = cloneTarget(event.relatedTarget);
        droppableReset(clone);
      }
      draginToDropped(event.relatedTarget);
    },
    ondropdeactivate: function (event) {
      // remove active dropzone feedback
      event.target.classList.remove('drop-active');
      event.target.classList.remove('drop-target');
    }
  });

  // this is used later in the resizing and gesture demos
  window.dragMoveListener = dragMoveListener;
  /* END of dragger */
});
