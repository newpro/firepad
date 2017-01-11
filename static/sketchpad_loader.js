$(document).ready(function() {
  var sketchpad = new Sketchpad({
    element: '#sketchpad',
    width: 400,
    height: 400,
    background: ''
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
