console.log('asdf')

var paused = false
var w = 40
var h = 40
var grid = []


function tick() {
  // poke each cell, in arbitrary order
}

function tock(n) {
  // do n ticks

  // update last tock
}

function render() {
  // update cell display

  // update counter display
}

function time_to_tock(ms) {
  // when was our last tock?

  // how many ticks should we do?

  // call tock
}

function loop() {
  // if not paused

  // get current time

  // call time_to_tock(ms)
}

function looper() {
  loop()
  window.requestAnimationFrame(looper)
}

function init() {
  // set up grid
  for(var i=0; i < w*h; i++) {
    grid[i] = new_cell()
  }

  // set up stats

  // set up nabes and diags
}

function charloop(from, to, fun) {

  fun(char, args)
}

function build_archetypes() {
  // a-z basic countdown (?)
  // a adds $ each tick and on revert
  // b-z spawn N times then revert
}

function new_cell() {
  return { char: " "
         , handler: false
         // , todo: 0
         // , skip: 0
         }
}

var handler = { init: []
              , pre: []
              , go: []
              , post: []
              }

var noop = function() {}
