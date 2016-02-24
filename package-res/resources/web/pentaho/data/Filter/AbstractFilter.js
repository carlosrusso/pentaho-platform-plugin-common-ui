/*!
 * Copyright 2010 - 2016 Pentaho Corporation.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
  "../../lang/Base",
  "../Element",
  "../TableView",
  "./Or",
  "./And",
  "./Not",
  "../../util/arg",
  "require"
], function(Base, Element, TableView, Or, And, Not, arg, require) {
  "use strict";

  /**
   * @lends pentaho.lang.AbstractFilter
   *
   * Base class for representing a filter.
   * @abstract
   */
  var AbstractFilter = Base.extend({
    constructor: function(value) {
      // Abstract filter has no value... What is this?
      this._value = value;
    },

    // Abstract filter has no value... What is this?
    /**
     *
     * @readonly
     */
    get value() {
      return this._value;
    },

    /**
     * Outputs a JSON that serializes the operation described by this filter.
     * The syntax loosely follows the query language of MongoDB.
     *
     * @return {Object} JSON object.
     */
    toSpec: function() {
      return null;
    },

    /**
     * Tests if an entry is an element of the set defined by this filter.
     *
     * @param {pentaho.data.Entry} - [dataTable]{@link pentaho.data.Table} entry.
     * @return {boolean}
     */
    contains: function(entry) {
      return false;
    },

    // or negate?
    /**
     * Returns a filter that is the inverse of this filter.
     * @returns {*}
     */
    invert: function() {
      return AbstractFilter.not(this);
    },

    // Why not N others?
    /**
     * Returns a filter that is the union of this filter with another.
     * In other words, implements the OR operation between this filter and another.
     * @param {} other -
     * @returns {*}
     */
    or: function(other) {
      return AbstractFilter.or(this, other);
    },

    // Why not N others?
    and: function(other) {
      return AbstractFilter.and(this, other);
    },

    apply: function(dataTable) {
      var nRows = dataTable.getNumberOfRows();
      var filteredRows = [];

      for(var k = 0; k < nRows; k++) {
        if(this.contains(new Element(dataTable, k))) {
          filteredRows.push(k);
        }
      }

      var dataView = new TableView(dataTable);
      dataView.setSourceRows(filteredRows);
      return dataView;
    }
  }, {
    or: function() {
      // Need to declare dependency, above.
      // Call require the first time only.
      if(!Or) Or = require("./Or");
      return new Or(arg.slice(arguments));
    },

    not: function(a) {
      if(!Not) Not = require("./Not");
      return new Not(a);
    },

    and: function() {
      if(!And) And = require("./And");
      return new And(arg.slice(arguments));
    },

    // No need for this method to exist is there? (as static)
    apply: function(filter, dataTable) {
      return filter.apply(dataTable);
    }
  });

  return AbstractFilter;

});
