/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var util = require('gcli/util');
var settings = require('gcli/settings');
var template = require('gcli/ui/domtemplate').template;
var Promise = require('gcli/promise').Promise;

/**
 * 'pref' command
 */
var prefCmdSpec = {
  name: 'pref',
  description: l10n.lookup('prefDesc'),
  manual: l10n.lookup('prefManual')
};

/**
 * 'pref list' command
 */
var prefListCmdSpec = {
  name: 'pref list',
  description: l10n.lookup('prefListDesc'),
  manual: l10n.lookup('prefListManual'),
  params: [
    {
      name: 'search',
      type: 'string',
      defaultValue: null,
      description: l10n.lookup('prefListSearchDesc'),
      manual: l10n.lookup('prefListSearchManual')
    }
  ],
  exec: function Command_prefList(args, context) {
    var document = context.document;
    var prefList = new PrefList(args.search, document);
    return prefList.element;
  }
};

/**
 * 'pref set' command
 */
var prefSetCmdSpec = {
  name: 'pref set',
  description: l10n.lookup('prefSetDesc'),
  manual: l10n.lookup('prefSetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefSetSettingDesc'),
      manual: l10n.lookup('prefSetSettingManual')
    },
    {
      name: 'value',
      // Bug 707008: Ideally this would be 'deferred' rather than 'string'
      type: 'string',
      description: l10n.lookup('prefSetValueDesc'),
      manual: l10n.lookup('prefSetValueManual')
    }
  ],
  exec: function Command_prefSet(args, context) {
    var conversion = args.setting.type.parseString(args.value);
    if (conversion.getStatus() !== require('gcli/types').Status.VALID) {
      throw new Error(conversion.message);
    }
    args.setting.value = conversion.value;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  canon.addCommand(prefCmdSpec);
  canon.addCommand(prefListCmdSpec);
  canon.addCommand(prefSetCmdSpec);
};

exports.shutdown = function() {
  canon.removeCommand(prefCmdSpec);
  canon.removeCommand(prefListCmdSpec);
  canon.removeCommand(prefSetCmdSpec);

  PrefList.outerTemplate = undefined;
  if (PrefList.style) {
    PrefList.style.parentElement.removeChild(PrefList.style);
  }
  PrefList.style = undefined;
};


/**
 * A manager for our version of about:config
 */
function PrefList(search, document) {
  PrefList.onFirstUseStartup(document);

  this.search = search;

  // Populated by the template
  this.input = undefined;
  this.table = undefined;

  this.element = PrefList.outerTemplate.cloneNode(true);
  template(this.element, this, { stack: 'pref_list_outer.html' });

  this.updateTable();
}

PrefList.prototype.updateTable = function() {
  util.clearElement(this.table);
  var newTable = PrefList.innerTemplate.cloneNode(true);
  while (newTable.hasChildNodes()) {
    this.table.appendChild(newTable.firstChild);
  }
  template(this.table, this, { stack: 'pref_list_inner.html' });
};

/**
 * Which preferences match the filter?
 */
Object.defineProperty(PrefList.prototype, 'preferences', {
  get: function() {
    return settings.getAll(this.search);
  },
  enumerable: true
});

/**
 * Which preferences match the filter?
 */
Object.defineProperty(PrefList.prototype, 'promisePreferences', {
  get: function() {
    var promise = new Promise();
    this.table.ownerDocument.defaultView.setTimeout(function() {
      promise.resolve(settings.getAll(this.search));
    }.bind(this), 10);
    return promise;
  },
  enumerable: true
});

PrefList.prototype.onFilterChange = function(ev) {
  if (this.input.value !== this.search) {
    this.search = this.input.value;
    this.updateTable();
  }
};

PrefList.prototype.onSetClick = function(ev) {
  context.requisition.update({
    typed: ev.target.getAttribute('data-command')
  });
};

PrefList.css = require('text!gcli/commands/pref_list.css');
PrefList.style = undefined;

PrefList.outerHtml = require('text!gcli/commands/pref_list_outer.html');
PrefList.outerTemplate = undefined;

PrefList.innerHtml = require('text!gcli/commands/pref_list_inner.html');
PrefList.innerTemplate = undefined;

/**
 * Called when the command is executed
 */
PrefList.onFirstUseStartup = function(document) {
  if (!PrefList.outerTemplate) {
    PrefList.outerTemplate = util.toDom(document, PrefList.outerHtml);
  }

  if (!PrefList.innerTemplate) {
    PrefList.innerTemplate = util.toDom(document, PrefList.innerHtml);
  }

  if (!PrefList.style && PrefList.css != null) {
    PrefList.style = util.importCss(PrefList.css, document);
  }
};

});