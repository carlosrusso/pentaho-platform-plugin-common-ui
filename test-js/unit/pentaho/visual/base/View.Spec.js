define([
  "pentaho/visual/base/View",
  "pentaho/visual/base",
  "pentaho/type/Context",
  "pentaho/type/events/DidChange",
  "tests/test-utils",
  "tests/pentaho/util/errorMatch"
], function(View, modelFactory, Context, DidChange, testUtils, errorMatch) {

  "use strict";

  /*global document:false, Promise:false, TypeError:false, spyOn:false, expect:false, jasmine:false */

  // Allow ~0
  // jshint -W016

  describe("pentaho.visual.base.View", function() {

    var Model, model;

    beforeEach(function() {

      var dataTableSpec = {
        model: [
          {name: "country", type: "string", label: "Country"},
          {name: "sales", type: "number", label: "Sales"}
        ],
        rows: [
          {c: [{v: "Portugal"}, {v: 12000}]},
          {c: [{v: "Ireland"}, {v: 6000}]}
        ]
      };

      var dataSpec = {
        width: 1,
        height: 1,
        data: {
          v: dataTableSpec
        }
      };

      var context = new Context();
      Model = context.get(modelFactory);
      model = new Model(dataSpec);

      // stress-test: have a change on the model take some time to complete
      // enable locally while developing tests
      /*
      model.on("will:change", function(){
        var t0 = new Date().valueOf();
        var waitPeriod = 1000; // in ms
        while(new Date().valueOf() < t0  + waitPeriod){};
      });
      */
    });

    describe("new (model)", function() {

      it("should throw if invoked with no arguments", function() {

        expect(function() {
          return new View();
        }).toThrow(errorMatch.argRequired("model"));

        expect(function() {
          return new View(model);
        }).not.toThrow();

      });
    });

    describe("validation", function() {

      it("should be valid if the model is valid", function() {
        var view = new View(model);

        expect(model.validate()).toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(true);
      });

      it("should be invalid if the model is invalid", function() {
        var model = new Model();
        var view = new View(model);

        expect(model.validate()).not.toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(false);
      });
    });

    describe("#update", function() {

      var it = testUtils.itAsync;

      var SimpleView = View.extend({
        _init: function() {

          this.base();

          this._setDomNode(document.createElement("div"));
        }
      });

      var DerivedView = View.extend({
        _updateAll: function() {
          this._setDomNode(document.createElement("div"));
          return "Rendered";
        }
      });

      var ValidationErrorView = DerivedView.extend({
        _validate: function() { return ["Some error"]; }
      });

      var UpdateErrorView = View.extend({
        _updateAll: function() { throw new Error("Some error"); }
      });

      function createListeners() {
        return jasmine.createSpyObj('listeners', [
          'didCreate',
          'willUpdate',
          'didUpdate',
          'rejectedUpdate'
        ]);
      }

      function createView(ViewClass, listeners) {

        var view = new ViewClass(model);
        if(listeners) {
          view.on("will:update",     listeners.willUpdate);
          view.on("did:update",      listeners.didUpdate);
          view.on("rejected:update", listeners.rejectedUpdate);
          view.on("did:create",      listeners.didCreate);
        }

        return view;
      }

      function expectError(listeners, errorMessage, expectedMessage) {
        expect(listeners.didUpdate).not.toHaveBeenCalled();
        expect(expectedMessage).toBe(errorMessage);
      }

      function expectValidationError(listeners, errorMessage, expectedMessage) {
        expectError(listeners, "View model is invalid:\n - " + expectedMessage, errorMessage);
      }

      it("should call the `will:update` event listeners if the view is valid", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        return view.update().then(function() {
          expect(listeners.willUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `did:update` event listeners if the view is valid and `_updateAll` was called", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        spyOn(view, '_updateAll').and.callThrough();

        return view.update().then(function() {
          expect(view._updateAll).toHaveBeenCalled();
          expect(listeners.didUpdate).toHaveBeenCalled();
        });
      });

      it("should not call the `will:update` event listener if the view is invalid", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
          expect(listeners.willUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if the view `will:update` event is canceled", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        listeners.willUpdate.and.callFake(function(event) {
          event.cancel("I was canceled");
        });

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectError(listeners, reason.message, "I was canceled");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if the view is invalid", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(listeners, reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should call the `rejected:update` event listener if `_updateAll` throws", function() {
        var listeners = createListeners();
        var view = createView(UpdateErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectError(listeners, reason.message, "Some error");
          expect(listeners.rejectedUpdate).toHaveBeenCalled();
        });
      });

      it("should invoke `_updateAll` if the view is valid", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        spyOn(view, '_updateAll').and.callThrough();

        return view.update().then(function() {
          expect(view._updateAll).toHaveBeenCalled();
        });
      });

      it("should reject the update if the first successful update does not set a DOM node", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        expect(view.domNode).toBe(null);

        spyOn(view, '_setDomNode');

        return view.update().then(function() {
          fail("Expected update to be rejected.");
        }, function(reason) {
          expect(reason instanceof Error).toBe(true);
        });
      });

      it("should emit a 'did:create' event before the first 'did:update'", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);
        
        listeners.didCreate.and.callFake(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        });

        listeners.didUpdate.and.callFake(function() {
          expect(listeners.didCreate).toHaveBeenCalled();
        });

        return view.update().then(function() {
          expect(listeners.didCreate).toHaveBeenCalled();
          expect(listeners.didUpdate).toHaveBeenCalled();
        });
      });

      it("should emit a 'did:create' event before the first 'did:update', " +
         "even when the dom node is set on _init", function() {
        var listeners = createListeners();
        var view = createView(SimpleView, listeners);

        listeners.didCreate.and.callFake(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        });

        listeners.didUpdate.and.callFake(function() {
          expect(listeners.didCreate).toHaveBeenCalled();
        });

        return view.update().then(function() {
          expect(listeners.didCreate).toHaveBeenCalled();
          expect(listeners.didUpdate).toHaveBeenCalled();
        });
      });

      it("should not create the visualization DOM element if the view is invalid", function() {

        var view = createView(ValidationErrorView);

        spyOn(view, '_setDomNode');

        return view.update().then(function() {
          fail("Expected update to have been rejected.");
        }, function(reason) {
          expect(view._setDomNode).not.toHaveBeenCalled();
        });
      });

      it("should not let the visualization's DOM element be set more than once", function() {
        var listeners = createListeners();
        var view = createView(DerivedView, listeners);

        var element = document.createElement("div");
        view._setDomNode(element);

        expect(view.domNode).toBe(element);

        expect(function() {
          view._setDomNode(document.createElement("span"));
        }).toThrow(errorMatch.operInvalid());
      });

      it("should not emit a 'did:create' event if the view is invalid", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(listeners, reason.message, "Some error");
        });
      });

      it("should not emit a 'did:create' event if `_validate` throws", function() {
        var listeners = createListeners();
        var view = createView(ValidationErrorView, listeners);

        return view.update().then(function() {
          expect(listeners.didUpdate).not.toHaveBeenCalled();
        }, function(reason) {
          expectValidationError(listeners, reason.message, "Some error");
        });
      });

      it("should return a promise to the current update when an update operation " +
         "is already undergoing (nested)", function() {
        var view = createView(SimpleView);

        var pDuring = null;

        spyOn(view, "_updateAll").and.callFake(function() {
          pDuring = view.update();
        });

        var pOuter = view.update();

        return pOuter.then(function() {
          expect(pOuter).toBe(pDuring);
        });
      });

      it("should return a promise to the current update when an update operation " +
         "is already undergoing (async)", function() {
        var view = createView(SimpleView);

        var _resolve = null;

        spyOn(view, "_updateAll").and.callFake(function() {
          return new Promise(function(resolve) { _resolve = resolve; });
        });

        var p = view.update();

        expect(p).toBe(view.update());

        _resolve();

        return p;
      });
    });

    describe("#update (handling of dirty bits)", function() {

      var it = testUtils.itAsync;

      var DerivedView = View.extend({
        _updateSize: function() {},
        _updateSelection: function() {}
      });

      function createView(model) {

        var view = new DerivedView(model);
        view._setDomNode(document.createElement("div"));

        view.isAutoUpdate = false;
        view._dirtyPropGroups.clear(); // view is clean

        // Ensure view is always valid
        spyOn(view, "_validate").and.returnValue(null);

        return view;
      }

      function createUpdateSpies(view) {
        return {
          updateSize:      spyOn(view, "_updateSize"),
          updateSelection: spyOn(view, "_updateSelection"),
          updateAll:       spyOn(view, "_updateAll")
        };
      }

      it("should call #_updateSize when the Size bit is set", function() {

        var view  = createView(model);
        var spies = createUpdateSpies(view);

        view._dirtyPropGroups.set(View.PropertyGroups.Size);

        return view.update().then(function() {
          expect(spies.updateSize).toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.updateAll).not.toHaveBeenCalled();
        });
      });

      it("should call #_updateSelection when the Selection bit is set", function() {

        var view  = createView(model);
        var spies = createUpdateSpies(view);

        view._dirtyPropGroups.set(View.PropertyGroups.Selection);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSelection).toHaveBeenCalled();
          expect(spies.updateAll).not.toHaveBeenCalled();
        });
      });

      it("should call #_updateAll when both the Size and Selection bits are set", function() {

        var view  = createView(model);
        var spies = createUpdateSpies(view);

        view._dirtyPropGroups.set(View.PropertyGroups.Size | View.PropertyGroups.Selection);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.updateAll).toHaveBeenCalled();
        });
      });

      it("should allow model changes of different PropGroups during an async update operation", function() {

        var view = createView(model);

        var _resolveSize = null;

        spyOn(view, "_updateSize").and.callFake(function() {
          return new Promise(function(resolve) { _resolveSize = resolve; });
        });

        spyOn(view, "_updateSelection");

        view._dirtyPropGroups.set(View.PropertyGroups.Size);

        var p = view.update();

        // _updateSize is still updating

        // Change the model's selection
        model.selectionFilter = null;

        // Finish _updateSize
        _resolveSize();

        return p.then(function() {

          expect(view._updateSize).toHaveBeenCalledTimes(1);
          expect(view._updateSelection).toHaveBeenCalledTimes(1);

        });
      });

      it("should allow model changes of the same PropGroups during an async update operation", function() {

        var view = createView(model);

        var _resolveSize1 = null;

        spyOn(view, "_updateSize").and.callFake(function() {
          // First Size update
          if(!_resolveSize1) {
            return new Promise(function(resolve) { _resolveSize1 = resolve; });
          }
        });

        view._dirtyPropGroups.set(View.PropertyGroups.Size);

        var p = view.update();

        // _updateSize is still updating

        // Change the model's width
        model.width = null;

        // Finish _updateSize operation 1
        _resolveSize1();

        return p.then(function() {

          expect(view._updateSize).toHaveBeenCalledTimes(2);

        });
      });
    });

    describe("#_onModelChange", function(){
      var view;

      beforeEach(function() {

        view = new View(model);

        view.isAutoUpdate = false;
        view._dirtyPropGroups.clear();

        expect(view.isDirty).toBe(false); // view is clean
      });

      it("should set the Size bit when only 'height' changes", function() {
        model.height = 100;
        expect(view._dirtyPropGroups.is(View.PropertyGroups.Size)).toBe(true);
      });

      it("should set the Size bit when only 'width' changes", function() {
        model.width = 100;
        expect(view._dirtyPropGroups.is(View.PropertyGroups.Size)).toBe(true);
      });

      it("should set the Selection bit  when 'selectionFilter' changes", function() {
        model.selectionFilter = null;
        expect(view._dirtyPropGroups.is(View.PropertyGroups.Selection)).toBe(true);
      });

      it("should not set the view as dirty when 'selectionMode' changes", function() {
        model.selectionMode = null;
        expect(view.isDirty).toBe(false);
      });

      it("should set the General bit when a property other than " +
         "'height', 'width' or 'selectionFilter' changes", function() {
        model.isInteractive = false;
        expect(view._dirtyPropGroups.is(View.PropertyGroups.General)).toBe(true);
      });
    }); // #_onModelChange

    describe("#isAutoUpdate", function() {

      it("should be set to `true` by default", function() {
        var view = new View(model);

        expect(view.isAutoUpdate).toBe(true);
      });

      it("should be writable", function() {
        var view = new View(model);

        view.isAutoUpdate = false;
        expect(view.isAutoUpdate).toBe(false);
      });

      describe("controls if the View updates in reaction to changes", function() {

        var DerivedView = View.extend({
          _updateSize: function() {},
          _updateSelection: function() {}
        });

        function createView(model) {
          var view = new DerivedView(model);
          view._setDomNode(document.createElement("div"));

          view.isAutoUpdate = false;
          view._dirtyPropGroups.clear(); // view is clean

          // Ensure view is always valid
          spyOn(view, "_validate").and.returnValue(null);

          return view;
        }

        function createUpdateSpies(view) {
          return {
            updateSize:      spyOn(view, "_updateSize"),
            updateSelection: spyOn(view, "_updateSelection"),
            updateAll:       spyOn(view, "_updateAll")
          };
        }

        it("should not trigger any update method when 'isAutoUpdate' is set to `false`", function() {

          var view = createView(model);

          view.isAutoUpdate = false;

          var update = spyOn(view, "update");

          // trigger a set of changes
          model.selectionFilter = null;
          model.isInteractive = false;
          model.width = 100;

          expect(update).not.toHaveBeenCalled();
        });

        describe("should resume triggering update methods when 'isAutoUpdate' is set " +
                 "to `true` after being `false`", function() {

          it("resumes running the #_updateSelection partial update", function(done) {
            var view  = createView(model);
            var spies = createUpdateSpies(view);

            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(spies.updateSelection).toHaveBeenCalled();
              done();
            });

            model.selectionFilter = null; // marks the view as dirty
          });

          it("resumes running the #_updateSize partial update", function(done) {
            var view  = createView(model);
            var spies = createUpdateSpies(view);

            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(spies.updateSize).toHaveBeenCalled();
              done();
            });

            model.width = 100; // marks the view as dirty
          });

          it("resumes running #_updateAll (full update)", function(done) {
            var view  = createView(model);
            var spies = createUpdateSpies(view);

            view.isAutoUpdate = true;

            view.on("did:update", function() {
              expect(spies.updateAll).toHaveBeenCalled();
              done();
            });

            model.isInteractive = false;
          });
        });
      });
    }); // #isAutoUpdate

    describe("#isDirty", function() {

      var view;

      beforeEach(function() {

        var DerivedView = View.extend({
          _updateAll: function() {},
          _validate: function() {
            return null;
          }
        });

        view = new DerivedView(model);
        view._setDomNode(document.createElement("div"));
      });

      it("should be `true` when the view is created", function() {
        expect(view.isDirty).toBe(true);
      });

      it("should be read-only", function() {
        expect(function() {
          view.isDirty = false;
        }).toThrowError(TypeError);
      });

      it("should be `true` when 'will:update' is called", function(done) {

        view.on("will:update", function() {
          expect(view.isDirty).toBe(true);
        });

        view.update().then(done, done.fail);
      });

      it("should be `true` during a call to one of the _updateZyx methods", function(done) {

        spyOn(view, "_updateAll").and.callFake(function() {

          expect(view.isDirty).toBe(true);

        });

        view.update().then(done, done.fail);
      });

      it("should be `false` when 'did:create' is called", function(done) {

        view.on("did:update", function() {
          expect(view.isDirty).toBe(false);
        });

        view.update().then(done, done.fail);
      });

      it("should be `true` when 'rejected:create' is called", function(done) {

        spyOn(view, "_updateAll").and.returnValue(Promise.reject("Just because."));

        view.on("rejected:update", function() {
          expect(view.isDirty).toBe(true);
        });

        view.update().then(done.fail, done);
      });

      it("should be `false` after a sucessful update", function(done) {

        expect(view.isDirty).toBe(true);

        view.update().then(function() {

          expect(view.isDirty).toBe(false);

          done();
        }, done.fail);
      });

      it("should mark the view as dirty when 'isAutoUpdate' is `false` and a change has taken place", function() {
        view._dirtyPropGroups.clear();

        view.isAutoUpdate = false;

        // trigger a set of changes that ought to call the render methods
        model.selectionFilter = null;

        expect(view.isDirty).toBe(true);
      });
    }); // #isDirty

    describe("#dispose", function() {

      var SimpleView = View.extend({
        _init: function() {

          this.base();

          this._setDomNode(document.createElement("div"));
        }
      });

      it("should be possible to be called once", function() {
        var view = new SimpleView(model);

        view.dispose();
      });

      it("should be possible to be called twice", function() {
        var view = new SimpleView(model);

        view.dispose();

        view.dispose();
      });

      it("should clear out the DOM node", function() {
        var view = new SimpleView(model);

        expect(view.domNode).not.toBe(null);
        view.dispose();
        expect(view.domNode).toBe(null);
      });

      it("should unregister the did:change event from the model", function() {
        var view = new SimpleView(model);

        view.dispose();

        expect(model._hasListeners("did:change")).toBe(false);
      });
    }); // #dispose
  });
});