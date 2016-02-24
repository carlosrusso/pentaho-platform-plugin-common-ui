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
  "./_toSpec"
], function(AbstractTreeFilter, _toSpec) {
  "use strict";

  // Please be consistent on the use of _children and children.

  var NotFilter = AbstractTreeFilter.extend({
    get type() { return "$not";},

    // immutability?
    insert: function(element) {
      this._children = [element];
      return this;
    },

    contains: function(entry) {
      // children is always an array and always of length 1...
      // (or an error should have been thrown in the constructor)
      // -> immutability?

      if(this.children && this.children.length === 1) {
        return !this.children[0].contains(entry);
      } else {
        throw Error("Poop");
      }
    },

    // This might be an acceptable, desirable, build-time simplification
    invert: function() {
      return this.children[0]; // see, you assume [0] exists here!
    },

    toSpec: function(){
      // ...but here vacillate again!
      return _toSpec(this.type, this._children.length ? this.children[0].toSpec() :  null);
    }
  });

  return NotFilter;

});