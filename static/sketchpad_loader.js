$(document).ready(function() {
  // sketchpad Init
  var sketchpad = new Sketchpad({
    element: '#sketchpad',
    width: 400,
    height: 400,
  });
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
