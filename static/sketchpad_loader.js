$(document).ready(function() {
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
});
