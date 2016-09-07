/******************************************************************************
Copyright (c) 2016, Intel Corporation

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice,
      this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of Intel Corporation nor the names of its contributors
      may be used to endorse or promote products derived from this software
      without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*****************************************************************************/
/**
 * Log Module
 * @module base/log
 */

/*eslint no-console:0*/

var _ = require("lodash");
var events = require("events");
var chalk = require("chalk");
var to_string = require("./to_string").to_string;


var seq = 1;
var event = new events.EventEmitter();

event.on("output", function(level, category, title, formatted_text) {
  console.log(formatted_text);
});

var colors = {
  seq: chalk.magenta,
  stack: chalk.cyan,
  exception: chalk.magenta,
  debug: {
    category: chalk.white,
    title: chalk.cyan,
    message: chalk.gray
  },
  info: {
    category: chalk.green,    
    title: chalk.cyan,
    message: chalk.white
  },
  warn: {
    category: chalk.white.bgMagenta,
    title: chalk.cyan,
    message: chalk.yellow
  },
  error: {
    category: chalk.white.bgRed.bold,
    title: chalk.cyan,
    message: chalk.red
  }
};

function configure_colors(updated_colors) {
  _.merge(colors, updated_colors);
}



var categories = {
  "*":      true,
  "hope":   true
};


function configure_categories(updated_categories) {
  _.merge(categories, updated_categories);
}


var options = {
  enabled: true,
  verbose: true,
  history_size: 1000,
  default_stack_depth: 8,
  default_seq_width: 5,
  default_category_width: 10,
  default_action_width: 15,
  show_error_of_any_category: true,
  show_warn_of_any_category: true,
  levels: {
    debug: false,
    info: true,
    warn: true,
    error: true
  }
};

function configure_options(updated_options) {
  _.merge(options, updated_options);
}


function need_log(level, category) {
  if (level === "warn" && options.show_warn_of_any_category) {
    return options.levels.warn;
  }
  if (level === "error" && options.show_error_of_any_category) {
    return options.levels.error;
  }
  // for a/b/c, we only select its root, i.e. a
  category = category.split("/")[0].toLowerCase();
  return options.enabled && options.levels[level] && 
    (_.isUndefined(categories[category]) ? categories["*"] : categories[category]);
}


function raw_category_string(category) {
  return _.padEnd(category, options.default_category_width);
}

function format_category_string(level, category) {
  return colors[level].category(" " + raw_category_string(category) + " ");
}

function format_seq_string() {
  return colors.seq(_.padStart(seq.toString(), options.default_seq_width)) + " ";
}

var _empty_leading_str = _.padEnd("", 
  options.default_category_width + options.default_seq_width + 3);
// for multiple line messags, we need to ensure its left side is aligned to
// left space for contents starting from 2nd line
function raw_text_string(msg, indent) {
  indent = indent || "";
  return msg.split("\n").join("\n" + _empty_leading_str + indent);
}

function format_text_string(level, category, title, msg) {
  return colors[level].title(to_string(title)) + " " + 
    colors[level].message(raw_text_string(to_string(msg)));
}

var history = [];

function output(level, category, title, formatted_text) {
  history.push(formatted_text);
  while (history.length > options.history_size) {
    history.shift();
  }
  event.emit("output", level, category, title, formatted_text);
}


function args_to_string(args) {
  return args.map(function(a) {
    return to_string(a);
  }).join(" ");
}

// hoist_levels defines go up by how many levels in call stack 
// levels is how many levels to be shown, rest of them would be ...
function exception_stack_string(e, hoist_levels, levels) {
  hoist_levels = hoist_levels || 0;
  if (!levels || levels < 0) {
    levels = 100;
  }

  var stacks = e.stack;
  var lines = stacks.split("\n");
  // the first line should be removed because it's message rather than stack
  lines.shift();
  for (var i = 0; i < hoist_levels; i++) {
    lines.shift();
  }
  if (levels > lines.length) {
    levels = lines.length;
  }
  var to_pop = lines.length - levels;
  for (i = 0; i < to_pop; i++) {
    lines.pop();
  }
  if (lines.length > 0 && to_pop > 0) {
    lines[lines.length - 1] += " ...";  
  }
  return lines.join("\n");
}


// get the current stack
function current_stack_string(hoist_levels, levels) {
  hoist_levels = hoist_levels || 0;
  var e_here = null;
  try {
    throw new Error("Check Stack");
  } catch(e) {
    e_here = e;
  }
  // hoist_level need add 1 to skip the stack of this funciton
  return exception_stack_string(e_here, hoist_levels + 1, levels);
}

function output_current_stack(level, category, title, hoist_levels, levels) {
  var s = ">>> LOG >>>" + current_stack_string(hoist_levels + 1, levels);
  output(level, category, title, 
    colors.stack(_empty_leading_str + raw_text_string(s)));
}

// if hoist_stack_level is -1, then no need to show stack
function raw_log(level, hoist_stack_levels, category, title, args) {
  if (!need_log(level, category)) {
    return;
  }  
  output(level, category, title, format_seq_string() +
    format_category_string(level, category) + 
    format_text_string(level, category, title, args_to_string(args)));
  seq++;
  if (seq > 99999) {
    seq = 1;
  }
  if (hoist_stack_levels >= 0) {
    output_current_stack(level, category, title, hoist_stack_levels + 1,
      options.verbose ? 100 : options.default_stack_depth);
  }
}

var log =
/**
 * Default log, using "info" level
 * @param {string} category The category
 * @param {string} title The title
 */
module.exports = _.rest(function(category, title, args) {
  raw_log("info", -1, category, title, args);
});


/**
 * Raw log
 * @name   raw
 * @param  {string} level    The level
 * @param  {number} hoist_stack_levels -1 means don't show stack, otherwise show stack by hoisting 
 * @param  {string} category The category
 * @param  {string} title    The title
 * @param  {Array}  args     An array of arguments to form the message
 */
log.raw = raw_log;


/**
 * log with "debug" level
 * @name   debug
 * @param  {string} category The category
 * @param  {string} title    The title
 */
log.debug = _.rest(function(category, title, args) {
  raw_log("debug", -1, category, title, args);
});

/**
 * log with "info" level
 * @name   info
 * @param  {string} category The category
 * @param  {string} title    The title
 */
log.info = log;

/**
 * log with "warn" level
 * @name  warn 
 * @param  {string} category The category
 * @param  {string} title    The title
 */
log.warn = function(category, title) {
  var args = _.toArray(arguments);
  args.shift();
  args.shift();
  raw_log("warn", 1, category, title, args);
};

/**
 * log with "error" level
 * @name  error 
 * @param  {string} category The category
 * @param  {string} title    The title
 */
log.error = function(category, title) {
  var args = _.toArray(arguments);
  args.shift();
  args.shift();
  raw_log("error", 1, category, title, args);
};




//////////////////////////////////////////////////////////////////
// Exports
//////////////////////////////////////////////////////////////////

/**
 * Create a log function for a category. Use this function to log no longer
 * needs to pass in catregory in parameters. The returned log function itself
 * has member functions debug, info, warn, error etc. while category is 
 * also omitted
 *
 * @function for_category
 * @param  {string} category The category, and the log 
 * @return {function}  The log function with category bound
 */
log.for_category = function(category) {
  var ret = _.partial(log, category);
  ret.debug = _.partial(log.debug, category);
  ret.info  = _.partial(log.info, category);
  ret.warn  = function(title) {
    var args = _.toArray(arguments);
    args.shift();
    raw_log("warn", 1, category, title, args);
  };
  ret.error = function(title) {
    var args = _.toArray(arguments);
    args.shift();
    raw_log("error", 1, category, title, args);
  }; 

  return ret;
};

/**
 * event emitter that has "output" event with cb (level, category, title, formatted_text)
 * @name event
 * @type {event}
 */
log.event = event;


/** 
 * Merge into default output colors
 * @function configure_colors
 * @param  {Object} updated_colors 
 */
log.configure_colors = configure_colors;

/**
 * Merge into default category settings
 * 
 * turn on/off the output of categorys. Category "*" means all. If it 
 * is set to true, then all categories are turned on. Otherwise, it
 * will check each individual category respectively.
 * 
 * @function configure_categories
 * @param  {Object} updated_categories 
 */
log.configure_categories = configure_categories;


/**
 * Merge into default options
 *
 * Options is in format of (default values are shown here as well) {
 *   enabled: true,
 *   verbose: false,
 *   history_size: 1000,
 *   default_stack_depth: 3,
 *   default_category_width: 10,
 *   default_action_width: 15,
 *   levels: {
 *     debug: false,
 *     info: true,
 *     warn: true,
 *     error: true
 *   }
 * }
 *
 * @function configure_options
 * @param  {Object} updated_options 
 */
log.configure_options = configure_options;


/**
 * History of logs
 * @name history
 * @type {Array}
 */
log.history = history;




module.exports = log;

