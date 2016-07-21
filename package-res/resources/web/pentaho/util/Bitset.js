define([
  "pentaho/lang/Base"
], function(Base) {
  "use strict";

  return Base.extend(/** @lends pentaho.util.Bitset# */{

    constructor: function(bits) {
      this._bits = bits != null ? bits : 0;
    },

    get isClear (){
      return this.bits === 0;
    },

    get: function(){
      return this._bits;
    },

    is: function(bits){
      return this._bits === bits;
    },

    set: function(bits) {
      this._bits = (bits == null) ? ~0 : (this._bits | bits);
    },

    /**
     * Clears a set of bits.
     *
     * If a `nully` argument is provided, all bits are cleared.
     *
     * @param {number} bits - The bits to be cleared.
     */
    clear: function(bits) {
      this._bits = (bits == null) ? 0 : (this._bits & ~bits);
    },

    /**
     * Tests if the current state is a subset of a given mask.
     *
     * Use this method to assert if no bits other than those described by the mask are
     * currently set.
     *
     * @param {!number} mask - An integer containing the bit mask to test.
     * @return {boolean}
     */
    isSubsetOf: function(mask){
      return (this._bits | mask) === mask;
    }

  });


});
