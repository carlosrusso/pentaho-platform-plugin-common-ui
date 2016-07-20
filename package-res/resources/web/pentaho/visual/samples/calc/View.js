define([
  "pentaho/visual/base/View",
  "pentaho/i18n!view"
], function(Visual, bundle) {

  "use strict";

  /*global document:false*/

  /**
   * @name View
   * @memberOf pentaho.visual.samples.calc
   * @class
   * @classDesc The `View` of the calculator visualization.
   *
   * @description Creates a calculator `View`.
   * @constructor
   * @param {pentaho.visual.samples.calc.Model} model - The calculator's visualization `Model`.
   */
  return Visual.extend(/** @lends pentaho.visual.samples.calc.View */{

    /** @override */
    _init: function() {
      this.base();
    },

    /** @override */
    _update: function() {
      var numSpan = this._setupHtmlSpan();

      var result = this._calculate(numSpan);
      // TODO: format result

      numSpan.innerHTML = bundle.get("result", [result]);

      this._resize(numSpan);

      this._setDomNode(numSpan);
    },

    /** @override */
    _resize: function(numSpan) {
      // Center the span
      var width  = this.model.width;
      var height = this.model.height;
      numSpan.style.left = ((width  - numSpan.offsetWidth ) / 2) + "px";
      numSpan.style.top  = ((height - numSpan.offsetHeight) / 2) + "px";
    },

    // ---------

    _setupHtmlSpan: function() {
      var numSpan = this.domNode;
      if(!numSpan) {
        numSpan = document.createElement("span");
        numSpan.style.fontSize = "42px";
        numSpan.style.position = "relative";
      }

      return numSpan;
    },

    _calculate: function() {
      var dataTable = this.model.getv("data"),
          R = dataTable.getNumberOfRows(),
          measureAttrName = this.model.measure.attributes.at(0).name,
          jMeasure = dataTable.model.attributes.get(measureAttrName).ordinal,
          getValue = function(k) {
            var v = dataTable.getValue(k, jMeasure);
            return !isNaN(v) && v != null ? v : null;
          },
          i;

      var value = null, vi;
      switch(this.model.operation) {
        case "max":
          for(i = 0; i < R; i++)
            if((vi = getValue(i)) != null)
              value = value == null ? vi : Math.max(value, vi);
          break;

        case "min":
          for(i = 0; i < R; i++)
            if((vi = getValue(i)) != null)
              value = value == null ? vi : Math.min(value, vi);
          break;

        case "avg":
          var total = value = 0;
          if(R) {
            for(i = 0; i < R; i++)
              if((vi = getValue(i)) != null)
                total += vi;
            value = total / R;
          }
          break;
      }
      return value;
    }
  });
});
