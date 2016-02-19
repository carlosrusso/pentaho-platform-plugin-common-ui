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
  "jasq"
], function() {
  "use strict";

  /*global describe:false, it:false, expect:false, beforeEach:false, beforeAll:false, Object:false*/


  //regular non-mocked usage
  describe("jasq injection on `describe` block with no mocks: pentaho.util.object - ", "pentaho/util/object", function() {
    var Spam, protoEggs, parrot;
    beforeEach(function() {
      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();
    });

    it("should return the input object, if the desired prototype is an object", function(O) {
      expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
    });
  });


  describe("jasq injection in loop of `describe` blocks with mocks: pentaho.util.object - ", function() {

    [{
      _label: "setProtoProp",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "ES5",
      has: {
        "Object.setPrototypeOf": true,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "setProtoCopy",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": false
      }
    }].forEach(function(conf) {
      describe("forcing " + conf._label + " implementation", {
        moduleName: "pentaho/util/object",
        mock: function() {
          return {
            "pentaho/shim/env": conf
          };
        },
        specify: function() {
          var Spam, protoEggs, parrot;
          beforeEach(function() {
            Spam = function() {
              this.bar = "bar";
            };
            Spam.prototype = new (function() {
              this.spam = "spam";
            })();
            parrot = new Spam();

            var myProto = function() {
              this.spam = "eggs";
            };
            protoEggs = new myProto();
          });

          it("should return the input object, if the desired prototype is an object", function(O) {
            if(O.setPrototypeOf) {
              expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
            }
          });
        }
      });
    });
  });


  // mocking on the it blocks
  describe("jasq injection in loop of `it` blocks with mocks: pentaho.util.object - ", "pentaho/util/object", function() {

    var Spam, protoEggs, parrot;
    beforeEach(function() {
      Spam = function() {
        this.bar = "bar";
      };
      Spam.prototype = new (function() {
        this.spam = "spam";
      })();
      parrot = new Spam();

      var myProto = function() {
        this.spam = "eggs";
      };
      protoEggs = new myProto();
    });

    [{
      _label: "setProtoProp",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "ES5",
      has: {
        "Object.setPrototypeOf": true,
        "Object.prototype.__proto__": true
      }
    }, {
      _label: "setProtoCopy",
      has: {
        "Object.setPrototypeOf": false,
        "Object.prototype.__proto__": false
      }
    }].forEach(function(conf) {

      it("forcing " + conf._label + " implementation: should return the input object, if the desired prototype is an object", {
        mock: {
          "pentaho/shim/env": conf
        },
        expect: function(O) {
          if(O.setPrototypeOf) {
            expect(O.setPrototypeOf(parrot, protoEggs)).toBe(parrot);
          }
        }
      });

    }); // setPrototypeOf
  });


}); // pentaho.util.object
