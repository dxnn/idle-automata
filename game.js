// an idle game featuring automata and fun

/* TODO:
   - toggle mousedraw mode with a key for continuous plonking
   - pause button / "offline" mode catchup is different?
   - keyboard controls
   - unicode characters
   - color buttons on arrival
   - solve starting upgrades required for 'a' utility...
   -- good colours
   -- a -> $, to show the ducats (each $ is a base-ducats ducat gain)
   -- show prices in upgrades and chars (or money is per-char? so you have to gain different types?)
   ~- clicking a symbol eats it for half its total value (recursive) [maybe, though auto-eaters are better, and half is probably too high (avoid clickers)]
   -- fractional respect via Math.random()
   -- show buttons / upgrades as they're available
   -- different places for button vs upgrades
   - upgrades: expand life and gold per-item and small global very early
   - upgrades:
     - per archetype: increase life, increase ducats, increase rate, % increase to children cumulative
     - overall: increate rate, add new game features (capital letters, new letters, symbols, fancy backgrounds (day/night), fertility bonus (w/ fancy highlight for good squares), ...)

*/
var w = 80
var h = 40
var grid = []
var ducats = 0
var paused = false
var buckets = [0,1,4,10,24,64]
var last_ms = 0
var last_max = 0
var upgrades = {}
var visibles = []
var base_rate = 1000
var base_life = 1
var renderers = []
var archetypes = {}
var base_ducats = 1
var render_rate = 100
var current_symbol = '$'
var el = document.getElementById.bind(document)
var el_grid, el_ducats, el_buttons, el_upgrades, el_messages

// EVENT LOOP

function tick() {
  // TODO: poke the cells in arbitrary order
  for(var i=0; i < w*h; i++) {
    var cell = grid[i]
    if(!cell.handler) continue
    if(cell.state == 'fresh') {
      cell.state = ''
      continue
    }
    if(cell.state == 'expired') {
      spawn(cell, " ")
      continue
    }
    run(cell, 'go')
    if(cell.life <= 0) {
      run(cell, 'post')
      cell.state = 'expired'
    }
  }
}

function tock(n) {
  // do n ticks
  for(var i=0; i < n; i++) {
    tick()
  }

  // update last tock
  last_ms = Date.now()
}

function time_to_tock(ms) {
  // when was our last tock?
  var diff = ms - last_ms

  // how many ticks should we do?
  // TODO: this doesn't work for ticks < 1
  var ticks = fancy_round(diff / base_rate)

  // call tock
  tock(ticks)
}

function loop() {
  if(paused) return
  var time = Date.now()         // get current time
  time_to_tock(time)
  render()
}

function looper() {
  loop()
  // window.requestAnimationFrame(looper)
  window.setTimeout(looper, Math.max(base_rate, render_rate))
}


// INITIALIZATION

function init() {
  // set up elements
  last_ms = Date.now()
  el_grid = el('grid')
  el_ducats = el('ducats')
  el_buttons = el('buttons')
  el_upgrades = el('upgrades')
  el_messages = el('messages')

  // set up grid
  for(var i=0; i < w*h; i++) {
    grid[i] = new_cell(i)
  }

 // set up nabes and diags
  for(var j=0; j < w*h; j++) {
    add_nabes(grid[j], j)
    add_diags(grid[j], j)
  }

  // build things
  build_bindings()
  build_archetypes()
  build_upgrades()

  // the main loop
  looper()
}

function add_nabes(cell, index) {
  cell.nabes.push(get_torus_cell(index,  0, -1))
  cell.nabes.push(get_torus_cell(index,  0,  1))
  cell.nabes.push(get_torus_cell(index, -1,  0))
  cell.nabes.push(get_torus_cell(index,  1,  0))
}

function add_diags(cell, index) {
  cell.diags.push(get_torus_cell(index,  1, -1))
  cell.diags.push(get_torus_cell(index,  1,  1))
  cell.diags.push(get_torus_cell(index, -1,  1))
  cell.diags.push(get_torus_cell(index, -1, -1))
}

function get_torus_cell(index, dx, dy) {
  if(dx == -1 && index%w == 0)
    dx = w-1
  if(dx ==  1 && index%w == w-1)
    dx = 1-w

  if(dy == -1 && index < w)
    dy = h-1
  if(dy ==  1 && index > w*(h-1))
    dy = 1-h

  return grid[index + dx + dy*w]
}

function build_bindings() {
  // ALL EVENT BINDINGS

  el_buttons.addEventListener('click', function(ev) {
    switch_char(ev.target.id)
  })

  document.addEventListener('keypress', function(ev) {
    switch_char(String.fromCharCode(ev.which))
  })

  el_upgrades.addEventListener('click', function(ev) {
    var upgrade = upgrades[ev.target.id]
    if(buy_upgrade(upgrade))
      remove_visible(ev.target.id)
  })

  el_grid.addEventListener('click', function(ev) {
    var index = click_to_index(ev)
    set_symbol(index, current_symbol)
  })
}

function build_archetypes() {
  // $ is pure money
  archetypes['$'] = clone(archetype_archetype)
  addhand('$', 'init', function(cell) {
    cell.life = fancy_round(base_life * archetypes['$'])
  })
  addhand('$', 'go', function(cell) {
    ducats += fancy_round(base_ducats * archetypes['$'].ducats)
    cell.life -= 1
  })

  // a-z basic countdown (?)
  charloop('a', 'z', function(char) {
    // create the basic archetype
    archetypes[char] = clone(archetype_archetype)
    var arch = archetypes[char]
    arch.price = Math.pow(4, char.charCodeAt() - 97) + (char == 'a' ? 0 : 4)

    // set 'life' for cell
    // THINK: different types should have different amounts of life
    addhand(char, 'init', function(cell) {
      cell.life = fancy_round(base_life * arch.life)
    })

    // give some money when you go away
    addhand(char, 'post', function(cell) {
      ducats += fancy_round(base_ducats * archetypes[char].ducats)
    })

    // spawn N times then revert
    addhand(char, 'go', function(cell) {
      var free = find_free_nabe(cell)
      var prev_char = char === 'a' ? '$' : String.fromCharCode(char.charCodeAt() - 1)
      if(!free) return
      cell.life -= 1
      spawn(free, prev_char)
    })
  })

  // hardcode a couple things
  archetypes['$'].ducats = 1
  archetypes['$'].price = 0
}

function build_upgrades() {
  upgrades =
    { "more life":  { price: 10000
                    , effect() { base_life *= 1.3 }}
    , "good life":  { price: 1000000
                    , effect() { base_life *= 1.3 }}
    , "great life": { price: 100000000
                    , effect() { base_life *= 1.3 }}
    }

  var adjs = ['a bit', 'slightly', 'somewhat', 'a little', 'even', 'considerably', 'noticably', 'lots', 'much', 'appreciably', 'substantially', 'significantly', 'markedly', 'conspicuously', 'doge']
  adjs.forEach(function(key, i) {
    upgrades[key+' faster'] = { price: Math.pow(10, i+1)
                              , effect: function() { base_rate *= 0.8 }
                              }
    upgrades[key+' richer'] = { price: Math.pow(16, i+2)
                              , effect: function() { base_ducats *= 1.5 }
                              }
  })

  ;[1,2,3,4,5,6,7].forEach(function(n) {
    charloop('a', 'z', function(char) {
      upgrades[char+' life level '+n] = { price: Math.pow(4, char.charCodeAt() - 96) + Math.pow(char.charCodeAt() - 95, n)
                                  , effect: function() { archetypes[char].life *= 1.22 }
                                  }
    })
  })
}


// INPUT ACTIONS

function switch_char(char) {
  current_symbol = char
  remove_class('#buttons span', 'selected')
  el(current_symbol).classList.add('selected')
}

function buy_upgrade(upgrade) {
  var price = upgrade.price
  if(price > ducats) {
    log("you can't afford that upgrade!")
    return false
  }

  ducats -= price
  upgrade.effect()
  return true
}

function click_to_index(ev) {
  var sel = window.getSelection()
  // console.log(selection.focusNode.data[selection.focusOffset]);
  var index = sel.focusOffset
  return Math.max(0, index - 1 - Math.floor(index / w)) // remove newlines
}

function set_symbol(index, char) {
  // check ducats
  var price = archetypes[char].price
  if(price > ducats) {
    log("you can't afford that!")
    return
  }

  // THINK: check current symbol is lesser?

  spawn(grid[index], char)
  ducats -= price
}


// ACTIONS

function find_free_nabe(cell) {
  var nabe
  var dims = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  for(var i=0; i < 4; i++) {
    var index = rand(3)
    nabe = get_torus_cell(cell.index, dims[index][0], dims[index][1])
    if(nabe && nabe.char == " ") return nabe
  }

  return false
}

function run(cell, handler) {
  if(!cell.handler) return
  var hands = cell.handler[handler]
  var len = hands.length
  for(var i=0; i<len; i++)
    hands[i](cell)
}

function spawn(cell, char) {
  cell.char = char
  cell.handler = archetypes[char]
  cell.state = 'fresh'
  run(cell, 'init')
}

function new_cell(i) {
  return { char: " "
         , handler: false
         , life: 0
         , index: i
         , nabes: []
         , diags: []
         }
}

var archetype_archetype = { init: []
                          , pre:  []
                          , go:   []
                          , post: []
                          , price: 1
                          , ducats: 0
                          , life: 1
                          , affordable: 99
                          }

function addhand(char, handle, fun) {
  archetypes[char][handle].push(fun)
}


// RENDERER

function render() {
  renderers.forEach(function(fun) { fun() })
}

renderers.push(
  function render_cells() {
    el_grid.textContent = grid_to_string()
  }
)

renderers.push(
  function render_stats() {
    el_ducats.textContent = ducats
  }
)

renderers.push(
  function render_visibles() {
    visibles.forEach(function(pair) {
      var id    = pair[0]
      var thing = pair[1]

      if(thing.affordable == Math.floor(ducats / thing.price)) return

      var old_afford = thing.affordable
      thing.affordable = Math.floor(ducats / thing.price)

      if(bucket_value(thing.affordable) == bucket_value(old_afford)) return

      bucket_style_do(id, thing)
    })
  }
)

renderers.push(
  function render_price_stuff() {
    if(ducats <= last_max) return

    var new_button  = get_new_buttons (last_max, ducats)
    var new_upgrade = get_new_upgrades(last_max, ducats)

    last_max = ducats
    if(!new_button && !new_upgrade) return

    // TODO: innerHTML is kind of a drag
    el_buttons .innerHTML = new_button  + el_buttons .innerHTML
    el_upgrades.innerHTML = new_upgrade + el_upgrades.innerHTML
  }
)

function bucket_value(num) {
  for(var i = buckets.length - 1; i >= 0; i--)
    if(num >= buckets[i]) return buckets[i]

  return 0
}

function bucket_style_do(id, thing) {
  var el_thing = document.getElementById(id)

  for(var i = 0; i < buckets.length; i++)
    el_thing.classList.remove('buy' + buckets[i])

  el_thing.classList.add('buy' + bucket_value(thing.affordable))
}

function remove_visible(id) {
  el(id).style.display = 'none'
  visibles = visibles.filter(function(v) { return v[0] != id })
}

function get_new_buttons(low, high) {
  var str = ''
  for(var char in archetypes) {
    var price = archetypes[char].price
    if(low < price && price <= high)
      str = make_visible(char, archetypes[char]) + str
  }
  return str
}

function get_new_upgrades(low, high) {
  var str = ''
  for(var name in upgrades) {
    var price = upgrades[name].price
    if(low < price && price <= high)
      str = make_visible(name, upgrades[name]) + str
  }
  return str
}

function make_visible(id, thing, label) {
  visibles.push([id, thing])
  return make_button(id, label || id) // + ': ' + thing.price)
}

function make_button(id, label) {
  return '<span id="' + id + '">' + label + ' </span>'
}

function grid_to_string() {
  var str = ""
  for(var i=0; i < w*h; i++) {
    if(i%w === 0) str += "\n"
    str += grid[i].char
  }
  return str
}

// HELPERS

function charloop(from, last, fun) {
  var from_ord = from.charCodeAt()
  var last_ord = last.charCodeAt()
  var args = [].slice.call(arguments, 3)

  for(var i=from_ord; i <= last_ord; i++)
    fun(String.fromCharCode(i), args)
}

function fancy_round(x) {
  // probabilistically rounds to nearby integer
  return (x|0) + (Math.random() < x%1)
}

function rand(n) {
  return Math.floor(Math.random() * (n + 1))
}

function noop() {}

function clone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch(e) {
    log(e)
    return {}
  }
}

function remove_class(query, classname) {
  var q = document.querySelectorAll(query)
  ;[].slice.call(q).forEach(function(el) {el.classList.remove(classname)})
}

var clear_message = throttle(function() { el_messages.textContent = '' }, 3000)

function log(str) {
  console.log(str)
  el_messages.textContent = str
  clear_message()
}

function throttle(fun, ms) {
  var timeout = false
  return function() {
    var new_timeout = setTimeout(function() {
          fun()
          timeout = false
        }, ms)
    if(timeout) clearTimeout(timeout)
    timeout = new_timeout
  }
}

function debounce(fun, ms) {
  var busy = false
  return function() {
    if(busy) return
    busy = true
    setTimeout(function() {
      fun() // THINK: could add args here maybe...
      busy = false
    }, ms)
  }
}

// STARTUP

init()
