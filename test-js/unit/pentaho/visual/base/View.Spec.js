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

  var it = testUtils.itAsync;

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
      });

      it("should be invalid if the model is invalid", function() {
        var model = new Model();
        var view = new View(model);

        expect(model.validate()).not.toBeNull(); //Null === no errors
      });
    });

    describe("#domNode", function() {

      it("should throw if domNode is set to nully", function() {
        var view = new View(model);

        expect(function() {
          view._setDomNode(null);
        }).toThrow(errorMatch.argRequired("domNode"));
      });

      it("should respect a set domNode", function() {
        var view = new View(model);

        var element = document.createElement("div");

        view._setDomNode(element);

        expect(view.domNode).toBe(element);
      });

      it("should not let the visualization's DOM element change to a different node", function() {
        var view = new View(model);

        view._setDomNode(document.createElement("div"));

        expect(function() {
          view._setDomNode(document.createElement("div"));
        }).toThrow(errorMatch.operInvalid());
      });
    });

    describe("#context", function() {

      it("should return the context of the view's model", function() {
        var view = new View(model);

        expect(view.context).toBe(model.type.context);
      });
    });

    describe("#update()", function() {

      describe("Will phase", function() {

        function createView() {

          var view = new View(model);

          // Silence these
          spyOn(view, "__onUpdateDidOuter");
          spyOn(view, "__onUpdateRejectedOuter").and.callFake(function(error) { return Promise.reject(error); });
          spyOn(view, "__updateLoop").and.returnValue(Promise.resolve());

          spyOn(view, "_onUpdateWill");

          return view;
        }

        it("should call the '_onUpdateWill' method before the update loop", function() {

          var view = createView();

          view.__updateLoop.and.callFake(function() {

            expect(view._onUpdateWill).toHaveBeenCalledTimes(1);

            return Promise.resolve();
          });

          return view.update().then(function() {
            expect(view.__updateLoop).toHaveBeenCalledTimes(1);
            expect(view._onUpdateWill).toHaveBeenCalledTimes(1);
          });
        });

        it("should reject the update and not perform the update loop if '_onUpdateWill' returns an error", function() {

          var view = createView();

          var errorWill = new Error();

          view._onUpdateWill.and.returnValue(errorWill);

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function(reason) {
            expect(view.__updateLoop).not.toHaveBeenCalled();
            expect(reason).toBe(errorWill);
          });
        });

        it("should reject the update and not perform the update loop if '_onUpdateWill' throws an error", function() {

          var view = createView();

          var errorWill = new Error();

          view._onUpdateWill.and.throwError(errorWill);

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function(reason) {
            expect(view.__updateLoop).not.toHaveBeenCalled();
            expect(reason).toBe(errorWill);
          });
        });

        it("should emit the 'will:update' event from within the _onUpdateWill method", function() {

          var view = createView();

          var listener = jasmine.createSpy("will:update");
          view.on("will:update", listener);

          var originalMethod = View.prototype._onUpdateWill;

          view._onUpdateWill.and.callFake(function() {

            expect(listener).not.toHaveBeenCalled();

            var result = originalMethod.apply(this, arguments);

            expect(listener).toHaveBeenCalledTimes(1);

            return result;
          });

          return view.update().then(function() {
            expect(view._onUpdateWill).toHaveBeenCalled();
          });
        });

        it("should reject the update if the 'will:update' event is canceled", function() {

          var view = createView();

          view._onUpdateWill.and.callThrough();

          var cancelReason;
          var listener = jasmine.createSpy("will:update").and.callFake(function(event) {
            event.cancel("I was canceled");
            cancelReason = event.cancelReason;
          });

          view.on("will:update", listener);

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function(reason) {
            expect(listener).toHaveBeenCalled();
            expect(cancelReason).toBe(reason);
          });
        });
      });

      describe("Update loop phase", function() {

        function createView() {

          var view = new View(model);
          view._setDomNode(document.createElement("div"));

          // Silence these
          spyOn(view, "_onUpdateWill");
          spyOn(view, "__onUpdateDidOuter");

          spyOn(view, "__onUpdateRejectedOuter").and.callFake(function(error) { return Promise.reject(error); });
          spyOn(view, "__updateLoop").and.callThrough();
          spyOn(view, '__validate');
          spyOn(view, "_updateAll");

          return view;
        }

        it("should call '__updateLoop' when the update is not canceled in the will phase", function() {

          var view = createView();

          return view.update().then(function() {
            expect(view.__updateLoop).toHaveBeenCalled();
          });
        });

        it("should call '__validate', before selecting the partial update method", function() {

          var view = createView();

          var originalMethod = view.__selectUpdateMethod;
          spyOn(view, '__selectUpdateMethod').and.callFake(function() {

            expect(view.__validate).toHaveBeenCalled();

            return originalMethod.apply(this, arguments);
          });

          return view.update().then(function() {
            expect(view.__selectUpdateMethod).toHaveBeenCalled();
          });
        });

        it("should reject the update if '__validate' returns errors", function() {

          var view = createView();

          var errors = [new Error("<A>"), new Error("<B>")];

          view.__validate.and.returnValue(errors);

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function(reason) {
            expect(reason.message).toContain("<A>");
            expect(reason.message).toContain("<B>");
          });
        });

        it("should select a partial update method if '__validate' returns no errors", function() {

          var view = createView();

          spyOn(view, '__selectUpdateMethod').and.callThrough();

          return view.update().then(function() {
            expect(view.__selectUpdateMethod).toHaveBeenCalled();
          });
        });

        it("should call the selected partial update method", function() {

          var view = createView();

          view._updateFoo = jasmine.createSpy("_updateFoo");
          spyOn(view, '__selectUpdateMethod').and.returnValue({name: "_updateFoo", mask: -1});

          return view.update().then(function() {
            expect(view._updateFoo).toHaveBeenCalled();
            expect(view._updateAll).not.toHaveBeenCalled();
          });
        });

        it("should allow returning nothing from the selected partial update method", function() {

          var view = createView();

          return view.update();
        });

        it("should allow returning a fulfilled promise from the selected partial update method", function() {

          var view = createView();

          view._updateAll.and.returnValue(Promise.resolve());

          return view.update();
        });

        it("should reject the update when a selected partial update method returns a rejected promise", function() {

          var view = createView();

          view._updateAll.and.returnValue(Promise.reject(new Error()));

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function() {
            // Success. Swallow rejection.
          });
        });

        it("should reject the update if the first successful update does not set a DOM node", function() {

          var view = createView();

          view.__domNode = null;

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function(reason) {
            expect(reason instanceof Error).toBe(true);
          });
        });
      });

      describe("Create phase", function() {

        function createView() {

          var view = new View(model);

          // Silence these
          spyOn(view, "_onUpdateWill");
          spyOn(view, "_onUpdateDid");
          spyOn(view, "_onCreateDid");
          spyOn(view, "__onUpdateDidOuter").and.callThrough();

          spyOn(view, "__onUpdateRejectedOuter").and.callFake(function(error) {
            this.__updatingPromise = null;
            return Promise.reject(error);
          });
          spyOn(view, "__updateLoop").and.returnValue(Promise.resolve());

          return view;
        }

        it("should call _onCreateDid if the update loop of the first update succeeds", function() {

          var view = createView();

          return view.update().then(function() {
            expect(view._onCreateDid).toHaveBeenCalled();
          });
        });

        it("should call _onCreateDid after the update loop", function() {

          var view = createView();

          view.__updateLoop.and.callFake(function() {
            expect(view._onCreateDid).not.toHaveBeenCalled();
            return Promise.resolve();
          });

          return view.update().then(function() {
            expect(view.__updateLoop).toHaveBeenCalledTimes(1);
          });
        });

        it("should call _onCreateDid before calling _onUpdateDid", function() {

          var view = createView();

          view._onUpdateDid.and.callFake(function() {
            expect(view._onCreateDid).toHaveBeenCalled();
          });

          return view.update().then(function() {
            expect(view._onUpdateDid).toHaveBeenCalled();
          });
        });

        it("should not call _onCreateDid if the first update is rejected", function() {

          var view = createView();
          view.__updateLoop.and.returnValue(Promise.reject(new Error("Failed")));

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function() {
            expect(view._onCreateDid).not.toHaveBeenCalled();
          });
        });

        it("should not call _onCreateDid on the second successful update", function() {

          var view = createView();

          var p1 = view.update();

          return p1.then(function() {

            expect(view._onCreateDid).toHaveBeenCalledTimes(1);

            view.__dirtyPropGroups.set();

            return view.update().then(function() {

              expect(view._onCreateDid).toHaveBeenCalledTimes(1);
            });
          });
        });

        it("should fulfill the update even if '_onCreateDid' throws an error", function() {

          var view = createView();

          view._onCreateDid.and.throwError(new Error());

          return view.update();
        });

        it("should call _onCreateDid on the second update if it succeeds and the first update did not", function() {

          var view = createView();

          view.__updateLoop.and.returnValue(Promise.reject(new Error("First update is rejected")));

          var p1 = view.update();

          return p1.then(function() {
            fail("Expected first update to have been rejected.");
          }, function() {
            expect(view._onCreateDid).not.toHaveBeenCalled();

            view.__dirtyPropGroups.set();
            view.__updateLoop.and.returnValue(Promise.resolve());

            return view.update().then(function() {
              expect(view._onCreateDid).toHaveBeenCalledTimes(1);
            });
          });
        });

        it("should emit the 'did:create' event from within the _onCreateDid method", function() {

          var view = createView();
          view._setDomNode(document.createElement("div"));

          var listener = jasmine.createSpy("did:create");
          view.on("did:create", listener);

          var originalMethod = View.prototype._onCreateDid;

          view._onCreateDid.and.callFake(function() {

            expect(listener).not.toHaveBeenCalled();

            var result = originalMethod.apply(this, arguments);

            expect(listener).toHaveBeenCalledTimes(1);

            return result;
          });

          return view.update().then(function() {
            expect(view._onCreateDid).toHaveBeenCalled();
          });
        });
      });

      describe("Did phase", function() {

        function createView() {

          var view = new View(model);

          // Silence these
          spyOn(view, "_onUpdateWill");
          spyOn(view, "_onUpdateDid");
          spyOn(view, "_onCreateDid");

          spyOn(view, "__onUpdateRejectedOuter").and.callFake(function(error) {
            this.__updatingPromise = null;
            return Promise.reject(error);
          });
          spyOn(view, "__updateLoop").and.returnValue(Promise.resolve());

          return view;
        }

        it("should call _onUpdateDid if the update succeeds", function() {

          var view = createView();

          return view.update().then(function() {
            expect(view._onUpdateDid).toHaveBeenCalled();
          });
        });

        it("should not call _onUpdateDid if the update is rejected", function() {

          var view = createView();
          view.__updateLoop.and.returnValue(Promise.reject(new Error("Failed")));

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function() {
            expect(view._onUpdateDid).not.toHaveBeenCalled();
          });
        });

        it("should call _onUpdateDid after the update loop", function() {

          var view = createView();

          view.__updateLoop.and.callFake(function() {
            expect(view._onUpdateDid).not.toHaveBeenCalled();
            return Promise.resolve();
          });

          return view.update().then(function() {
            expect(view.__updateLoop).toHaveBeenCalledTimes(1);
          });
        });

        it("should fulfill the update even if '_onUpdateDid' throws an error", function() {

          var view = createView();

          view._onUpdateDid.and.throwError(new Error());

          return view.update();
        });

        it("should emit the 'did:update' event from within the _onUpdateDid method", function() {

          var view = createView();

          var listener = jasmine.createSpy("did:update");
          view.on("did:update", listener);

          var originalMethod = View.prototype._onUpdateDid;

          view._onUpdateDid.and.callFake(function() {

            expect(listener).not.toHaveBeenCalled();

            var result = originalMethod.apply(this, arguments);

            expect(listener).toHaveBeenCalledTimes(1);

            return result;
          });

          return view.update().then(function() {
            expect(view._onUpdateDid).toHaveBeenCalled();
          });
        });
      });

      describe("Rejected phase", function() {

        function createView() {

          var view = new View(model);

          // Silence these
          spyOn(view, "_onUpdateWill");
          spyOn(view, "__updateLoop").and.returnValue(Promise.reject(new Error("Failed")));
          spyOn(view, "_onUpdateRejected").and.callThrough();
          spyOn(view, "__onUpdateDidOuter").and.callFake(function() {
            this.__updatingPromise = null;
          });
          return view;
        }

        it("should call _onUpdateRejected if the update is rejected", function() {

          var view = createView();

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function() {
            expect(view._onUpdateRejected).toHaveBeenCalled();
          });
        });

        it("should not call _onUpdateRejected if the update is fulfilled", function() {

          var view = createView();
          view.__updateLoop.and.returnValue(Promise.resolve());

          return view.update().then(function() {
            expect(view._onUpdateRejected).not.toHaveBeenCalled();
          });
        });

        it("should call _onUpdateRejected after the update loop", function() {

          var view = createView();

          view.__updateLoop.and.callFake(function() {
            expect(view._onUpdateRejected).not.toHaveBeenCalled();
            return Promise.reject(new Error("Failed."));
          });

          return view.update().then(function() {
            expect(view.__updateLoop).toHaveBeenCalled();
          }, function() {
            expect(view.__updateLoop).toHaveBeenCalled();
          });
        });

        it("should reject the update with the original error, even if '_onUpdateRejected' throws an error", function() {

          var error0 = new Error("Failed");
          var view = createView();
          view.__updateLoop.and.returnValue(Promise.reject(error0));

          view._onUpdateRejected.and.throwError(new Error());

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function(reason) {
            expect(reason).toBe(error0);
          });
        });

        it("should emit the 'rejected:update' event from within the _onUpdateRejected method", function() {

          var view = createView();

          var listener = jasmine.createSpy("rejected:update");
          view.on("rejected:update", listener);

          var originalMethod = View.prototype._onUpdateRejected;

          view._onUpdateRejected.and.callFake(function() {

            expect(listener).not.toHaveBeenCalled();

            var result = originalMethod.apply(this, arguments);

            expect(listener).toHaveBeenCalledTimes(1);

            return result;
          });

          return view.update().then(function() {
            fail("Expected update to have been rejected.");
          }, function() {
            expect(view._onUpdateRejected).toHaveBeenCalled();
          });
        });
      });

      describe("Concurrency", function() {

        function createView() {

          var view = new View(model);

          view._setDomNode(document.createElement("div"));

          return view;
        }

        it("should be able to call update twice", function() {

          var view = createView();

          return view.update().then(function() {

            view.__dirtyPropGroups.set();

            return view.update();
          });
        });

        it("should return a promise to the current update when an update operation " +
           "is already undergoing (nested)", function() {

          var view = createView();

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

          var view = createView();

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
    });

    describe("#update (handling of dirty bits)", function() {

      var DerivedView = View.extend({
        _updateSize:      function() {},
        _updateSelection: function() {},
        _updateSizeAndSelection: function() {}
      });

      function createView() {

        var view = new DerivedView(model);
        view._setDomNode(document.createElement("div"));

        view.isAutoUpdate = false;
        view.__dirtyPropGroups.clear(); // view is clean

        // Ensure view is always valid
        spyOn(view, "__validate").and.returnValue(null);

        return view;
      }

      function createUpdateSpies(view) {
        return {
          updateSize:      spyOn(view, "_updateSize"),
          updateSelection: spyOn(view, "_updateSelection"),
          updateSizeAndSelection: spyOn(view, "_updateSizeAndSelection"),
          updateAll:       spyOn(view, "_updateAll")
        };
      }

      it("should return immediately when the view is not updating and is not dirty", function() {

        var view  = createView();

        spyOn(view, "_updateAll");

        return view.update().then(function() {
          expect(view._updateAll).not.toHaveBeenCalled();
        });
      });

      it("should call #_updateSize when the Size bit is set", function() {

        var view  = createView();
        var spies = createUpdateSpies(view);

        view.__dirtyPropGroups.set(View.PropertyGroups.Size);

        return view.update().then(function() {
          expect(spies.updateSize).toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.updateSizeAndSelection).not.toHaveBeenCalled();
          expect(spies.updateAll).not.toHaveBeenCalled();
        });
      });

      it("should call #_updateSelection when the Selection bit is set", function() {

        var view  = createView();
        var spies = createUpdateSpies(view);

        view.__dirtyPropGroups.set(View.PropertyGroups.Selection);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSizeAndSelection).not.toHaveBeenCalled();
          expect(spies.updateAll).not.toHaveBeenCalled();
          expect(spies.updateSelection).toHaveBeenCalled();
        });
      });

      it("should call #_updateSizeAndSelection when both the Size and Selection bits are set", function() {

        var view  = createView();
        var spies = createUpdateSpies(view);


        view.__dirtyPropGroups.set(View.PropertyGroups.Size | View.PropertyGroups.Selection);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.updateAll).not.toHaveBeenCalled();
          expect(spies.updateSizeAndSelection).toHaveBeenCalled();
        });
      });

      it("should call #_updateAll when both the General, Size and Selection bits are set", function() {

        var view  = createView();
        var spies = createUpdateSpies(view);

        view.__dirtyPropGroups.set(View.PropertyGroups.General | View.PropertyGroups.Size | View.PropertyGroups.Selection);

        return view.update().then(function() {
          expect(spies.updateSize).not.toHaveBeenCalled();
          expect(spies.updateSelection).not.toHaveBeenCalled();
          expect(spies.updateSizeAndSelection).not.toHaveBeenCalled();
          expect(spies.updateAll).toHaveBeenCalled();
        });
      });

      it("should allow model changes of different PropGroups during an async update operation", function() {

        var view = createView();

        var _resolveSize = null;

        spyOn(view, "_updateSize").and.callFake(function() {
          return new Promise(function(resolve) { _resolveSize = resolve; });
        });

        spyOn(view, "_updateSelection");

        view.__dirtyPropGroups.set(View.PropertyGroups.Size);

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

        var view = createView();

        var _resolveSize1 = null;

        spyOn(view, "_updateSize").and.callFake(function() {
          // First Size update
          if(!_resolveSize1) {
            return new Promise(function(resolve) { _resolveSize1 = resolve; });
          }
        });

        view.__dirtyPropGroups.set(View.PropertyGroups.Size);

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

    describe("#_onChangeDid", function(){
      var view;

      beforeEach(function() {

        view = new View(model);

        view.isAutoUpdate = false;
        view.__dirtyPropGroups.clear();

        expect(view.isDirty).toBe(false); // view is clean
      });

      it("should set the Size bit when only 'height' changes", function() {
        model.height = 100;
        expect(view.__dirtyPropGroups.is(View.PropertyGroups.Size)).toBe(true);
      });

      it("should set the Size bit when only 'width' changes", function() {
        model.width = 100;
        expect(view.__dirtyPropGroups.is(View.PropertyGroups.Size)).toBe(true);
      });

      it("should set the Selection bit  when 'selectionFilter' changes", function() {
        model.selectionFilter = null;
        expect(view.__dirtyPropGroups.is(View.PropertyGroups.Selection)).toBe(true);
      });

      it("should not set the view as dirty when 'selectionMode' changes", function() {
        model.selectionMode = null;
        expect(view.isDirty).toBe(false);
      });

      it("should set the General bit when a property other than " +
         "'height', 'width' or 'selectionFilter' changes", function() {
        model.isInteractive = false;
        expect(view.__dirtyPropGroups.is(View.PropertyGroups.General)).toBe(true);
      });

      it("should call '_onChangeDid' to classify the change", function() {
        spyOn(view, "_onChangeDid").and.callThrough();
        model.isInteractive = false;
        expect(view._onChangeDid).toHaveBeenCalled();
      });

      it("should not call 'update' if '_onChangeDid' does recognize any relevant change", function() {
        spyOn(view, "_onChangeDid");
        spyOn(view, "update");
        model.isAutoUpdate  = true;

        model.isInteractive = false;
        expect(view.update).not.toHaveBeenCalled();
      });

      it("should not call 'update' if '_onChangeDid' marks changes but those changes already existed", function() {
        spyOn(view, "_onChangeDid").and.callFake(function(dirtyPropGroups) {
          dirtyPropGroups.set(View.PropertyGroups.General);
        });

        spyOn(view, "update");
        model.isAutoUpdate  = true;

        view.__dirtyPropGroups.set(View.PropertyGroups.General);

        model.isInteractive = false;

        expect(view.update).not.toHaveBeenCalled();
      });
    }); // #_onChangeDid

    describe("#isAutoUpdate", function() {

      function createView() {
        var view = new View(model);
        view._setDomNode(document.createElement("div"));

        view.isAutoUpdate = false;
        view.__dirtyPropGroups.clear(); // view is clean

        // Ensure view is valid
        spyOn(view, "__validate").and.returnValue(null);

        return view;
      }

      it("should be `true` by default", function() {
        var view = new View(model);

        expect(view.isAutoUpdate).toBe(true);
      });

      it("should be writable", function() {
        var view = new View(model);

        view.isAutoUpdate = false;
        expect(view.isAutoUpdate).toBe(false);
      });

      it("should not trigger any update method when 'isAutoUpdate' is set to `false`", function() {

        var view = createView();

        spyOn(view, "update");

        // Trigger a set of changes
        model.selectionFilter = null;
        model.isInteractive = false;
        model.width = 100;

        expect(view.update).not.toHaveBeenCalled();
      });

      it("should call 'update' when 'isAutoUpdate' is set to `true` after being `false` and " +
         "the model changes", function() {

        var view  = createView();

        view.isAutoUpdate = true;

        spyOn(view, "update").and.returnValue(Promise.resolve());

        model.width = 100; // marks the view as dirty

        expect(view.update).toHaveBeenCalled();
      });

      // coverage. should also test that logger.warn is called...
      it("should log the rejected case of an auto-update", function() {

        var view = createView();

        spyOn(view, "update").and.returnValue(Promise.reject(new Error("Something went wrong...")));

        view.isAutoUpdate = true;
        model.width = 100; // marks the view as dirty

        expect(view.update).toHaveBeenCalled();
      });
    }); // #isAutoUpdate

    describe("#isDirty", function() {

      var view;

      beforeEach(function() {

        var DerivedView = View.extend({
          __validate: function() { return null; }
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

      it("should be `true` when 'will:update' is called", function() {

        view.on("will:update", function() {
          expect(view.isDirty).toBe(true);
        });

        return view.update();
      });

      it("should be `true` during a call to one of the _updateZyx methods", function() {

        spyOn(view, "_updateAll").and.callFake(function() {

          expect(view.isDirty).toBe(true);

        });

        return view.update();
      });

      it("should be `false` when 'did:update' is called", function() {

        view.on("did:update", function() {
          expect(view.isDirty).toBe(false);
        });

        return view.update();
      });

      it("should be `true` when 'rejected:update' is called", function() {

        spyOn(view, "_updateAll").and.returnValue(Promise.reject("Just because."));

        view.on("rejected:update", function() {
          expect(view.isDirty).toBe(true);
        });

        return view.update().then(function() {
          fail("Expected update to have been rejected.");
        }, function() {
          // swallow error
        });
      });

      it("should be `false` after a successful update", function() {

        expect(view.isDirty).toBe(true);

        return view.update().then(function() {

          expect(view.isDirty).toBe(false);
        });
      });

      it("should mark the view as dirty when 'isAutoUpdate' is `false` and a change has taken place", function() {
        view.__dirtyPropGroups.clear();

        view.isAutoUpdate = false;

        // trigger a set of changes that ought to call the render methods
        model.selectionFilter = null;

        expect(view.isDirty).toBe(true);
      });
    }); // #isDirty

    describe("#isUpdating", function() {

      var view;

      var DerivedView = View.extend({
        __validate:  function() { return null; }
      });

      beforeEach(function() {
        view = new DerivedView(model);
        view._setDomNode(document.createElement("div"));
      });

      it("should be `false` when the view is created", function() {
        expect(view.isUpdating).toBe(false);
      });

      it("should be read-only", function() {
        expect(function() {
          view.isUpdating = false;
        }).toThrowError(TypeError);
      });

      it("should be `true` when 'will:update' is called", function() {

        view.on("will:update", function() {
          expect(view.isUpdating).toBe(true);
        });

        return view.update();
      });

      it("should be `true` during a call to one of the _updateZyx methods", function() {

        spyOn(view, "_updateAll").and.callFake(function() {

          expect(view.isUpdating).toBe(true);

        });

        return view.update();
      });

      it("should be `false` when 'did:udpate' is called", function() {

        view.on("did:update", function() {
          expect(view.isUpdating).toBe(false);
        });

        return view.update();
      });

      it("should be `false` when 'rejected:update' is called", function() {

        spyOn(view, "_updateAll").and.returnValue(Promise.reject("Just because."));

        view.on("rejected:update", function() {
          expect(view.isUpdating).toBe(false);
        });

        return view.update().then(function() {
          fail("Expected update to have been rejected.");
        }, function() {
          // swallow error
        });
      });

      it("should be `false` after a successful update", function() {

        return view.update().then(function() {

          expect(view.isUpdating).toBe(false);
        });
      });
    }); // #isUpdating

    describe("#dispose", function() {

      function createView() {

        var view = new View(model);

        view._setDomNode(document.createElement("div"));

        return view;
      }

      it("should be possible to be called once", function() {
        var view = createView();

        view.dispose();
      });

      it("should be possible to be called twice", function() {
        var view = createView();

        view.dispose();

        view.dispose();
      });

      it("should clear out the DOM node", function() {
        var view = createView();

        expect(view.domNode).not.toBe(null);
        view.dispose();
        expect(view.domNode).toBe(null);
      });

      it("should unregister the did:change event from the model", function() {
        var view = createView();

        view.dispose();

        expect(model._hasListeners("did:change")).toBe(false);
      });
    }); // #dispose

    describe("#extend", function() {

      // coverage
      it("should be possible to extend without passing an instSpec argument", function() {
        var view = new View(model);

        view.extend();
      });

      it("should register _updateXyz method with the corresponding mask", function() {

        var updateSize = function() {};
        var DerivedView = View.extend({
          _updateSize: updateSize
        });

        var info = DerivedView.__UpdateMethods[View.PropertyGroups.Size];
        expect(info.name).toBe("_updateSize");
        expect(info.mask).toBe(View.PropertyGroups.Size);

        expect(DerivedView.__UpdateMethodsList.indexOf(info)).toBeGreaterThan(-1);
      });

      it("should register _updateXyz method with the corresponding mask when using 'implement'", function() {

        var updateSize = function() {};
        var DerivedView = View.extend({});

        DerivedView.implement({
          _updateSize: updateSize
        });

        var info = DerivedView.__UpdateMethods[View.PropertyGroups.Size];
        expect(info.name).toBe("_updateSize");
        expect(info.mask).toBe(View.PropertyGroups.Size);

        expect(DerivedView.__UpdateMethodsList.indexOf(info)).toBeGreaterThan(-1);
      });
      
      // TODO: should also test it logs a warning...
      it("should ignore an _updateXyz method which has no known property groups", function() {

        var count = View.__UpdateMethodsList.length;

        var updateBarAndFoo = function() {};
        var DerivedView = View.extend({
          _updateBarAndFoo: updateBarAndFoo
        });

        expect(DerivedView.__UpdateMethodsList.length).toBe(count);
      });
      
      it("should ignore unknown property groups and still register the _updateXyz method under the known mask", function() {

        var updateSizeAndFoo = function() {};
        var DerivedView = View.extend({
          _updateSizeAndFoo: updateSizeAndFoo
        });

        var info = DerivedView.__UpdateMethods[View.PropertyGroups.Size];
        expect(info.name).toBe("_updateSizeAndFoo");
        expect(info.mask).toBe(View.PropertyGroups.Size);

        expect(DerivedView.__UpdateMethodsList.indexOf(info)).toBeGreaterThan(-1);
      });

      it("should not re-register an update method that is already declared in the base class", function() {

        var updateSize = function() {};
        var DerivedView = View.extend({
          _updateSize: updateSize
        });

        var info = DerivedView.__UpdateMethods[View.PropertyGroups.Size];

        var DerivedView2 = DerivedView.extend({
          // Override
          _updateSize: function() {}
        });

        var info2 = DerivedView2.__UpdateMethods[View.PropertyGroups.Size];

        expect(info2).toBe(info);
      });
    }); // #extend
  });
});