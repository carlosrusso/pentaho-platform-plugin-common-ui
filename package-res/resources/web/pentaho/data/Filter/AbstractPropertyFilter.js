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
  "./AbstractFilter",
  "./_toSpec"
], function(AbstractFilter, toSpec) {
  "use strict";

  var AbstractPropertyFilter = AbstractFilter.extend({
    get type() { return null;},

    constructor: function(property, value) {
      this.base(value);

      // Should have a public getter for this as well.
      this._property = property;
    },

    // Maybe it's a good time to star rethinking the name of this _method...
    _method: null,

    // Although this could perhaps be made more efficient by testing existence and
    // reading the value in the same go...
    contains: function(entry) {
      return entry.has(this._property) &&
             this._method(entry.getValue(this._property));
    },

    /**
     * @inheritdoc
     */
    toSpec: function() {
      return toSpec(this._property, toSpec(this.type, this._value));
    }
  });

  return AbstractPropertyFilter;


});