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

  var OrFilter = AbstractTreeFilter.extend({
    get type() { return "$or";},

    contains: function(entry) {
      // AbstractTreeFilter always creates children...
      // Also, if N is 0, the loop below already evaluates to false.
      var N = this.children ? this.children.length : 0;
      if(N === 0) return false; // false is the neutral element of an OR operation

      var memo = false;
      for(var k = 0; k < N && !memo; k++) {
        memo = memo || this.children[k].contains(entry);
      }
      return memo;
    },

    // same notes as for And.and
    or: function() {
      for(var k = 0, N = arguments.length; k < N; k++) {
        this.insert(arguments[k]);
      }
      return this;
    },

    // same notes as for And.invert
    invert: function() {
      var negatedChildren = this.children.map(function(child) {
        return child.invert();
      });

      // Idem, need to declare ./And as a dependency above and then
      // only go through require the first time.
      var AndFilter = require("./And");
      return new AndFilter(negatedChildren);
    }
  });

  return OrFilter;

});