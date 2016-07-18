define([
  "pentaho/visual/base/View",
  "pentaho/visual/base",
  "pentaho/type/Context",
  "pentaho/type/events/DidChange",
  "tests/pentaho/util/errorMatch"
], function(View, modelFactory, Context, DidChange, errorMatch) {
  "use strict";

  /*global document:false*/

  describe("pentaho/visual/base/View", function() {
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
    });

    describe("the constructor ", function() {

      it("should throw if invoked with no arguments", function() {
        expect(function() {
          return new View();
        }).toThrow(errorMatch.argRequired("model"));

        expect(function() {
          return new View(model);
        }).not.toThrow();
      });

    });

    describe("validation: ", function() {

      it("should be valid if the model is valid", function(){
        var view = new View(model);
        expect(model.validate()).toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(true);
      });

      it("should be invalid if the model is invalid", function(){
        var model = new Model();
        var view = new View(model);
        expect(model.validate()).not.toBeNull(); //Null === no errors
        expect(view._isValid()).toBe(false);
      });

      it("`update()` should invoke `_update` if the view is valid", function(done) {
        var DerivedView = View.extend({
          _update: function(){ return "Rendered"; }
        });
        var view = new DerivedView(model);

        spyOn(view, '_update').and.callThrough();

        view.update().then(function resolved() {
          expect(view._update).toHaveBeenCalled();
          done();
        }, function rejected() {
          done.fail();
        });
      });

      it("`update()` should not invoke `_update` if the view is invalid", function(done) {
        var DerivedView = View.extend({
          _validate: function(){ return ["Some error"]; },
          _update: function(){ return "Rendered"; }
        });
        var view = new DerivedView(model);

        spyOn(view, '_update').and.callThrough();

        view.update().then(function() {
          done.fail();
        }, function(reason) {
          expect(reason.message).toBe("Some error");
          expect(view._update).not.toHaveBeenCalled();
          done();
        });

      });

      it("`update()` should not invoke `_update` if `_validate` throws", function(done) {
        var DerivedView = View.extend({
          _validate: function(){ throw new Error("Some error"); },
          _update: function(){ return "Rendered"; }
        });
        var view = new DerivedView(model);

        spyOn(view, '_update').and.callThrough();

        debugger;
        view.update().then(function resolved() {
          done.fail();
        }, function rejected(reason) {
          expect(reason.message).toBe("Some error");
          expect(view._update).not.toHaveBeenCalled();
          done();
        });

      });


    });

    describe("#_onChange", function(){
      var view, _resize, _update, _selectionChanged;
      beforeEach(function(){
        view = new View(model);
        _resize = spyOn(view, "_resize");
        _selectionChanged = spyOn(view, "_selectionChanged");
        _update = spyOn(view, "_update");
      });

      it("triggers #_resize when only 'height' changes", function(){
        model.height = 100;

        expect(_resize).toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("triggers #_resize when only 'width' changes", function(){
        model.width = 100;

        expect(_resize).toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("triggers #_selectionChanged when 'selectionFilter' changes", function(){
        model.selectionFilter = null;

        expect(_resize).not.toHaveBeenCalled();
        expect(_selectionChanged).toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("does not trigger any render method when 'selectionMode' changes", function(){
        model.selectionMode = null;

        expect(_resize).not.toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).not.toHaveBeenCalled();
      });

      it("triggers #_update when a property other than 'height', 'width' or 'selectionFilter' changes", function(){
        model.isInteractive = false;

        expect(_resize).not.toHaveBeenCalled();
        expect(_selectionChanged).not.toHaveBeenCalled();
        expect(_update).toHaveBeenCalled();
      });

    }); // #_onChange
  });

});
