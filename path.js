/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

var Path = (function () {
  const sin = Math.sin;
  const cos = Math.cos;
  const tan = Math.tan;
  const ceil = Math.ceil;
  const abs = Math.abs;
  const PI = Math.PI;
  const TwoPI = 2 * PI;
  const HalfPI = PI / 2;

  const MOVE_TO = 0;
  const LINE_TO = 1;
  const QUAD_TO = 2;
  const CUBIC_TO = 3;
  const CommandName = ["moveTo", "lineTo", "quadTo", "cubicTo"];
  const CommandArguments = [2,2,4,6];

  function constructor() {
    // To make sure the path always starts with a MOVE_TO, we inject one here.
    // moveTo() automatically coalesces redundant MOVE_TO sequences.
    this.cmds = [MOVE_TO];
    this.args = [0, 0];
  };

  constructor.prototype = {
    moveTo: function(x, y) {
      var cmds = this.cmds;
      var args = this.args;
      // Coalesce redundant sequences of MOVE_TO commands.
      if (cmds[cmds.length - 1] == MOVE_TO) {
        cmds.pop();
        args.pop();
        args.pop();
      }
      cmds.push(MOVE_TO);
      args.push(x, y);
    },
    lineTo: function(x, y) {
      // Avoid 0-length lines (close() generates these, amongst others).
      var args = this.args;
      var lastX = args[args.length - 2];
      var lastY = args[args.length - 1];
      if (x == lastX && y == lastY)
        return;
      this.cmds.push(LINE_TO);
      this.args.push(x, y);
    },
    quadTo: function(x1, y1, x2, y2) {
      this.cmds.push(QUAD_TO);
      this.args.push(x1, y1, x2, y2);
    },
    cubicTo: function(x1, y1, x2, y2, x3, y3) {
      this.cmds.push(CUBIC_TO);
      this.args.push(x1, y1, x2, y2, x3, y3);
    },
    close: function() {
      var args = this.args;
      var startX = args[0];
      var startY = args[1];
      this.lineTo(startX, startY);
    },
    arc: function(originX, originY, radius, startAngle, endAngle, antiClockwise) {
      this.lineTo(originX + cos(startAngle) * radius, originY + sin(startAngle) * radius);

      // Clockwise we always sweep from the smaller to the larger angle, ccw
      // it's vice versa.
      if (antiClockwise && (endAngle < startEngle)) {
        var correction = ceil(startAngle - endAngle) / TwoPI;
        endAngle += correction * TwoPI;
      } else if (antiClockwise && (startAngle < endAngle)) {
        var correction = ceil(endAngle - startAngle) / TwoPI;
        startAngle += correction * TwoPI;
      }

      // Sweeping more than 2 * pi is a full circle.
      if (!antiClockwise && (endAngle - startAngle > TwoPI)) {
        endAngle = StartAngle + TwoPI;
      } else if (antiClockwise && (startAngle - endAngle > TwoPI)) {
        endAngle = StartAngle - TwoPI;
      }

      // Calculate the total arc we're going to sweep.
      var arcSweepLeft = abs(endAngle - startAngle);
      var sweepDirection = antiClockwise ? -1.0 : 1.0;
      var currentStartAngle = startAngle;

      while (arcSweepLeft > 0) {
        // We guarantee here the current point is the start point of the next
        // curve segment.
        var currentEndAngle;

        if (arcSweepLeft > HalfPI) {
          currentEndAngle = currentStartAngle + HalfPI * sweepDirection;
        } else {
          currentEndAngle = currentStartAngle + arcSweepLeft * sweepDirection;
        }

        var currentStartPointX = originX + cos(currentStartAngle) * radius;
        var currentStartPointY = originY + sin(currentStartAngle) * radius;
        var currentEndPointX = originX + cos(currentEndAngle) * radius;
        var currentEndPointY = originY + sin(currentEndAngle) * radius;

        // Calculate kappa constant for partial curve. The sign of angle in the
        // tangent will actually ensure this is negative for a counter clockwise
        // sweep, so changing signs later isn't needed.
        var kappa = (4 / 3) * tan((currentEndAngle - currentStartAngle) / 4.0) * radius;

        var tangentStartX = -sin(currentStartAngle);
        var tangentStartY = cos(currentStartAngle);
        var reverseTangentEndX = sin(currentEndAngle);
        var reverseTangentEndY = -cos(currentEndAngle);

        this.cubicTo(currentStartPointX + tangentStartX * kappa,
                     currentStartPointY + tangentStartY * kappa,
                     currentEndPointX + reverseTangentEndX * kappa,
                     currentEndPointY + reverseTangentEndY * kappa,
                     currentEndPointX,
                     currentEndPointY);

        arcSweepLeft -= HalfPI;
        currentStartAngle = currentEndAngle;
      }
    },
    toString: function() {
      var s = "";
      var cmds = this.cmds;
      var args = this.args;
      var length = cmds.length;
      for (var n = 0, pos = 0; n < cmds.length; ++n) {
        var cmd = cmds[n];
        var argc = CommandArguments[cmd];
        if (s.length)
          s += " ";
        s += CommandName[cmd];
        s += "(";
        s += args.slice(pos, pos + argc).join(",");
        s += ")";
        pos += argc;
      }
      return "[Path " + s + "]";
    }
  };

  return constructor;
})();
