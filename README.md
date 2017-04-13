# Firepad

Realtime multi-user interactive pad based on Firebase, sketchpad.js, and interact.js.

# Status

Currently is pre-release (0.2), [Dandy, the hobo gentleman](http://futurama.wikia.com/wiki/Dandy_Jim).

Please fork the repo and play, and feel free to issue pull requests!

The more ppl fork it, the faster it would be improved.

# Rookie Setup

* Create a new Firebase Account
* Create a project
* Look into static/settings_sample.js
  * Change YOUR_PROJECT_ID to yours
  * Optionally set background image
  * Rename the file to static/settings.js
* Replace your [Firebase rule](https://firebase.google.com/docs/database/security/)
	* Go to your project, database, rules, replace with rules.json
* Open main.html
* Start to play!

# Secure Setup

Support for [Admin SDK](https://firebase.google.com/docs/admin/setup) is coming!

# Features

# Docs is coming!

* Multiple users editing
  * Drawpad, with Redo and Undo
  * Drag and drop components
* Set background image

# Release Notes:

* Zoidberg (pre-release 0.1): added drawpad support
* Dandy (pre-release 0.2): added drag and drop support

# Thanks and dependencies

* [firebase](https://firebase.google.com/)
* [bootstrap.js](http://getbootstrap.com/)
* [sketchpad.js](https://github.com/yiom/sketchpad)
* [interact.js](http://interactjs.io/)
