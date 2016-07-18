/*!
 * Copyright 2010 - 2016 Pentaho Corporation. All rights reserved.
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
  "pentaho/lang/Event",
  "pentaho/visual/base/events/DidCreate",
  "tests/pentaho/util/errorMatch"
], function(Event, DidCreate, errorMatch) {
  "use strict";

  /* global describe:false, it:false, expect:false, beforeEach:false */

  describe("pentaho.visual.base.events.DidCreate -", function() {
    var type = "create";

    it("should extend Event", function() {
      expect(DidCreate.prototype instanceof Event).toBe(true);
    });

    it("static property type should return full type name", function() {
      expect(DidCreate.type).toBe("did:" + type);
    });

    it("static property type should be read-only", function() {
      expect(function() {
        DidCreate.type = "New Name";
      }).toThrowError(TypeError);
    });

    describe("instances -", function() {
      var event, element;

      beforeEach(function() {
        element = document.createElement("div");
        event = new DidCreate({}, element);
      });

      it("should extend Event", function() {
        expect(event instanceof Event).toBe(true);
      });

      it("element property should be the same than received in the constructor", function() {
        expect(event.element).toBe(element);
      });

      it("element property should be read-only", function() {
        expect(function() {
          event.element = "other";
        }).toThrowError(TypeError);
      });
    });

    it("should throw if element parameter is not passed to the constructor", function() {
      expect(function() {
        return new DidCreate({});
      }).toThrow(errorMatch.argRequired("element"));
    });

  }); // #pentaho.visual.base.events.DidCreate
});
