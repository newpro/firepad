// states markers, order matters
const STATES = ['empty', 'dropped', 'leaved'], // states applied immidately
      MID_STATES = ['reset', 'delete']; // states applied when mouse end

// Firebase Branch variables
const DROP_BRANCH = 'drop';

/* ---- HELPERS ---- */
function getRelativePosition(obj1, obj2) {
  let coord1 = getCoords(obj1);
  let coord2 = getCoords(obj2);
  return {
      left: coord1.left - coord2.left,
      top: coord1.top - coord2.top
  }
}

function getCoords(elem) { // crossbrowser version
    // CREDIT:
    // http://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document#answer-26230989
    let box = elem.getBoundingClientRect();

    let body = document.body;
    let docEl = document.documentElement;

    let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
    let scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

    let clientTop = docEl.clientTop || body.clientTop || 0;
    let clientLeft = docEl.clientLeft || body.clientLeft || 0;

    return {
      top: box.top +  scrollTop - clientTop,
      left: box.left + scrollLeft - clientLeft
    };
}

function setPos(target, x, y) {
  // set target to x, y pos
  // NOTE: it will be set relative to its container
  target.style.webkitTransform =
  target.style.transform =
    'translate(' + x + 'px, ' + y + 'px)';
  // update the position attributes
  target.setAttribute('data-x', x);
  target.setAttribute('data-y', y);
}

function setRelatedPos(target, parent, dropzone, top, left) {
  /*
  instead of set position relative to droppable
  set it relative to dropzone, to remove droppable components dependency
  this requires to recalcuate and set at position relative to parentNode
  */
  // calcuate real position on page
  let dCoords = getCoords(dropzone);
  let realCoord = {
    top: top + dCoords.top,
    left: left + dCoords.left
  }
  // calcuate relative to parentNode (container)
  let pCoords = getCoords(parent);
  let shiftCoord = {
    top: pCoords.top - realCoord.top,
    left: pCoords.left - realCoord.left
  }
  // set to shift coord
  // shift coords use x, y, negative value of left/top
  setPos(target, -(shiftCoord.left), -(shiftCoord.top));
}

function getPos(target) {
  return {
    'x': parseFloat(target.getAttribute('data-x')) || 0,
    'y': parseFloat(target.getAttribute('data-y')) || 0
  }
}

function cloneTarget(target) {
  // clone the target, insert in correct position and return the clone reference
  var clone = target.cloneNode(true);
  var par = target.parentNode;
  par.insertBefore(clone, par.childNodes[0]);
  return clone;
}

function injectNew(id, parentNode, dropzone, top, left) {
  // inject a brand new dropped target to x, y
  // ref: http://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
  let template = document.createElement('template');
  template.innerHTML = '<div class="draggable droppable dropped" data-x="0" data-y="0" style="transform: translate(0px, 0px);">#dropped</div>';
  let newNode = template.content.firstChild;
  newNode.id = id;
  // setPos(newNode, x, y);
  setRelatedPos(newNode, parentNode, dropzone, top, left);
  parentNode.insertBefore(template.content.firstChild, parentNode.childNodes[0]);
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

  NOTE: droppable is consistant across all state, acceptable by dropzone.
*/

function draginToDropped(target) {
  // lifecycle coordinator: dragin -> dropped
  target.classList.remove('dragin');
  setState(target, 'dropped');
}

function droppableReset(target) {
  // reset a droppable element (cloned) to initial state
  // lifecycle coordinator: any -> droppable
  setPos(target, 0, 0);
  target.classList.remove('dropped', 'dragin', 'reset');
  target.classList.add('empty');
  setState(target, 'droppable');
}

function droppableDelete(ref, target) {
  // lifecycle coordinator
  // remove it from db and let watcher do the job:
  ref.child(DROP_BRANCH).child(target.getAttribute('id')).remove();
}

// -- Droppable Firebase Writers --
function droppableWrite(ref, target, dropzone) {
  // write a droppable to DB
  // params: element id & coordinators
  let pos = getRelativePosition(target, dropzone);
  ref.child(DROP_BRANCH).push({
    top: pos.top,
    left: pos.left,
    p: target.parentNode.getAttribute('id') // container id
  });
}

function droppableAdjust(ref, target, dropzone) {
  // change the data in db
  // behave exactly like write except rewrite
  let pos = getRelativePosition(target, dropzone);
  let updates = {};
  updates['top'] = pos.top;
  updates['left'] = pos.left;
  ref.child(DROP_BRANCH).child(target.getAttribute('id')).update(updates);
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
  var fireRef = new Firebase(fireUrl),
      drawRef = fireRef.child('drawing');
  var sketchpad = new Sketchpad({
    element: '#sketchpad',
    width: 400,
    height: 400,
    background: background
  }, drawRef);
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

  // droppable sync
  drawRef.child(DROP_BRANCH).on("child_added", function(snapshot) {
    let newDroppable = snapshot.val();
    injectNew(
      snapshot.key(),
      document.getElementById(newDroppable['p']), // parentNode (container)
      document.getElementById('dropzone'),
      newDroppable.top,
      newDroppable.left
    );
  });

  drawRef.child(DROP_BRANCH).on("child_removed", function(snapshot) {
    let target = document.getElementById(snapshot.key());
    interact(target).unset();
    target.remove();
  });

  drawRef.child(DROP_BRANCH).on("child_changed", function(snapshot) {
    let shot = snapshot.val();
    setRelatedPos(document.getElementById(snapshot.key()), // droppable
                  document.getElementById(shot.p), // relative parent
                  document.getElementById('dropzone'),
                  shot.top, shot.left);
  });

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
        droppableDelete(drawRef, event.target);
      }
      if (hasState(event.target, 'reset') || hasState(event.target, 'empty')) {
        droppableReset(event.target);
      }
    }
  });

  function dragMoveListener (event) {
    // translate the element
    var pos = getPos(event.target);
    setPos(event.target,
      (pos['x'] + event.dx),
      (pos['y'] + event.dy))
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
      setState(target, 'dragin');
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
      var pos = getPos(event.relatedTarget);
      if (!hasState(event.relatedTarget, 'dropped')) { // a new dropped is dropped
        // write to db and render a new reset target
        // NOTE: add to db will make the realtime watcher to inject the new object
        droppableWrite(drawRef, event.relatedTarget, event.target);
        droppableReset(event.relatedTarget);
      } else { // adjust a existing dropped
        draginToDropped(event.relatedTarget);
        droppableAdjust(drawRef, event.relatedTarget, event.target);
      }
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
