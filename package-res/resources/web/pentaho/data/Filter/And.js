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
  "./AbstractTreeFilter",
  "require"
], function(AbstractTreeFilter, require) {
  "use strict";

  /**
   * @name And
   * @memberOf pentaho.data.Filter
   * @class
   * @abstract
   * @amd pentaho/data/Filter/And
   *
   * @classdesc The `And` class implements a type of AbstractTreeFilter {@link pentaho.data.Filter.AbstractTreeFilter}.
   *
   * @example
   * <caption> Create a new <code>And</code> filter.
   *
   * require(["pentaho/data/Table", "pentaho/data/Filter/IsIn", "pentaho/data/Filter/IsEqual", "pentaho/data/Filter/And"], function(Table, IsIn, IsEqual, And) {
   *   var data = new Table({
   *     model: [
   *       {name: "product", type: "string", label: "Product"},
   *       {name: "sales", type: "number", label: "Sales"},
   *       {name: "inStock", type: "boolean", label: "In Stock"}
   *     ],
   *     rows: [
   *       {c: [{v: "A"}, {v: 12000}, {v: true}]},
   *       {c: [{v: "B"}, {v: 6000}, {v: true}]},
   *       {c: [{v: "C"}, {v: 12000}, {v: false}]},
   *       {c: [{v: "D"}, {v: 1000}, {v: false}]},
   *       {c: [{v: "E"}, {v: 2000}, {v: false}]},
   *       {c: [{v: "F"}, {v: 3000}, {v: false}]},
   *       {c: [{v: "G"}, {v: 4000}, {v: false}]}
   *     ]
   *   });
   *
   *
   *  var sales12k = new IsIn("sales", [12000]);
   *  var inStock = new IsEqual("inStock", true);
   *  var combination1 = new And([sales12k, inStock]);
   *  var data1 = combination1.filter(data); //data1.getValue(0, 0) === "A"
   * });
   */
  var AndFilter = AbstractTreeFilter.extend("pentaho.data.Filter.And", /** @lends pentaho.data.Filter.And# */{

    /**
     * @inheritdoc
     * @readonly
     */
    get type() { return "$and";},

    /**
     * @inheritdoc
     */
    contains: function(entry) {
      var N = this.children ? this.children.length : 0;
      if(N === 0) return true; // true is the neutral element of an AND operation

      var memo = true;
      for(var k = 0; k < N && memo; k++) {
        memo = memo && this.children[k].contains(entry);
      }
      return memo;
    },

    /**
     * @inheritdoc
     */
    intersection: function() {
      for(var k = 0, N = arguments.length; k < N; k++) {
        this.insert(arguments[k]);
      }
      return this;
    },

    /**
     * @inheritdoc
     */
    negation: function() {
      var negatedChildren = this.children.map(function(child) {
        return child.negation();
      });
      var OrFilter = require("./Or");
      return new OrFilter(negatedChildren);
    }
  });

  return AndFilter;

});