const { TokenType, Token } = require('./token')
const { Literal, Grouping, Unary, Binary } = require('./ast')

/*
expression -> literal | unary | binary | grouping ;
literal -> NUMBER | STRING | "true" | "false" | "nil" ;
grouping -> "(" expression ")" ;
unary -> ( "-" | "!" ) expression ;
binary -> expression operator expression ;
operator -> "==" | "!=" | "<" | "<=" | ">" | ">=" | "+" | "-" | "*" | "/" ;
*/

const error = function(token, message) {
  report(token.line, ` at '${token.lexeme}' ${message}`)
  return new InterpreterError(token, message)
}

class InterpreterError extends Error {
  constructor(token, message) {
    super(`${token} ${message}`)
    this.name = 'InterpreterError'
  }
}

class TypeError extends Error {
  constructor({operator, operand, expected, message = ''}) {
    super(`Type error at line ${operator.line}: '${operator.lexeme}' expects ${expected} got '${operand}' ${message}`)
    this.name = "TypeError"
  }
}

function isTruthy (e) {
  // The Ruby way: false and nil are falsey all else truthy
  if (e === null || e === undefined) { return false }
  else if (e === true || e === false) { return e }
  else { return true }
}

function areEqual(a, b) {
  // TODO: relying on JavaScript coercion. Make semantics more explicit.
  return a == b
}

function typeCheckNumber(operator, operand) {
  if (typeof operand === "number") { return }
  throw new TypeError({ operator: operator, operand: operand, expected: 'number' })
}

function typeCheckNumbers(operator, left, right) {
  if (typeof left === "number" && typeof right === "number" ) { return }
  const operand = (typeof left === "number") ? right : left
  throw new TypeError({ operator: operator, operand: operand, expected: 'number' })
}

function typeCheckNumbersOrStrings(operator, left, right) {
  if (typeof left === "number") {
    if (typeof right === "number" ) {
      return
    } else {
      throw new TypeError({ operator: operator, operand: right, expected: 'number' })
    }
  } else if (typeof left === "string") {
    if (typeof right === "string" ) {
      return
    } else {
      throw new TypeError({ operator: operator, operand: right, expected: 'string' })
    }
  }
}

const InterpreterVisitor = {
  visitLiteral: function (l) { return l.val },
  visitGrouping: function (g) { return g.expr.accept(this) },
  visitUnary: function (u) {
    let e = u.expr.accept(this)
    if (u.operator.type === TokenType.MINUS) {
      typeCheckNumber(u.operator, e)
      e = -e
    } else if (u.operator.type === TokenType.BANG) {
      e = !isTruthy(e)
    } else {
      //throw error(u, "Expected '-' or '!'.")
      e = null
    }
    return e
  },
  visitBinary: function (b) {
    // TODO: later, for short circuiting logical operators, don't evaulate right unless needed
    // NOTE: operators evaluated in left-to-right order. Do we declare this part of the
    // semantics of Lox? Or is it an implementation decision not to be relied on?
    let left = b.left.accept(this)
    let right = b.right.accept(this)
    let e
    // TODO: later, type check left and right before applying the operator
    // currently, javascript coerces and everything just "comes out right"
    switch (b.operator.type) {
    case TokenType.EQUAL_EQUAL:
      e = areEqual(left, right)
      break
    case TokenType.BANG_EQUAL:
      e = !areEqual(left, right)
      break
    case TokenType.LESS:
      typeCheckNumbers(b.operator, left, right)
      e = (left < right)
      break
    case TokenType.LESS_EQUAL:
      typeCheckNumbers(b.operator, left, right)
      e = (left <= right)
      break
    case TokenType.GREATER:
      typeCheckNumbers(b.operator, left, right)
      e = (left > right)
      break
    case TokenType.GREATER_EQUAL:
      typeCheckNumbers(b.operator, left, right)
      e = (left >= right)
      break
    case TokenType.PLUS:
      typeCheckNumbersOrStrings(b.operator, left, right)
      e = (left + right)
      break
    case TokenType.MINUS:
      typeCheckNumbers(b.operator, left, right)
      e = (left - right)
      break
    case TokenType.STAR:
      typeCheckNumbers(b.operator, left, right)
      e = (left * right)
      break
    case TokenType.SLASH:
      typeCheckNumbers(b.operator, left, right)
      e = (left / right)
      break
    default:
      //throw error(b, `Expected '==', '!=', '<', '<=', '>', '>=', '+', '-', '*', '/'.`)
      e = null
    }
    return e
  }
}

function interpret(e) {
  return e.accept(InterpreterVisitor)
}

module.exports = { interpret }

