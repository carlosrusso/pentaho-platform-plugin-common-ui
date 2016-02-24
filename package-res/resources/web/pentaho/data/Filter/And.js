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

  var AndFilter = AbstractTreeFilter.extend({
    // Mixing serialization concerns with the name of the $type?
    get type() { return "$and";},

    contains: function(entry) {
      // AbstractTreeFilter always creates children...
      // Also, if N is 0, the loop below already evaluates to true.
      var N = this.children ? this.children.length : 0;
      if(N === 0) return true; // true is the neutral element of an AND operation

      var memo = true;
      for(var k = 0; k < N && memo; k++) {
        memo = memo && this.children[k].contains(entry);
      }
      return memo;
    },

    // Where did the immutable spirit of the API go to?
    // Should return a new AND filter with _this_ and all the arguments as operands.
    // So the default Abstract impl would do?
    and: function() {
      for(var k = 0, N = arguments.length; k < N; k++) {
        this.insert(arguments[k]);
      }
      return this;
    },

    // While this is cool, this would be used for moving an outer and inward
    // in a DNF simplification step...
    // So the default Abstract impl would do?
    invert: function() {
      var negatedChildren = this.children.map(function(child) {
        return child.invert();
      });

      // This sync require call fails unless you define "./Or" as a dependency above.
      // Then, you should do: if(!Or) Or = require("./Or");
      // and not got through require every time.
      var OrFilter = require("./Or");
      return new OrFilter(negatedChildren);
    }
  });

  return AndFilter;

});