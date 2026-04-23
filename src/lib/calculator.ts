type TokenType = "number" | "operator" | "leftParen" | "rightParen";

type Token = {
  type: TokenType;
  value: string;
};

const OP_PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "u-": 3,
};

const RIGHT_ASSOCIATIVE = new Set<string>(["u-"]);

function tokenize(expression: string): Token[] {
  const input = expression.replace(/\s+/g, "");
  if (!input) {
    throw new Error("Expression is empty");
  }

  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch >= "0" && ch <= "9" || ch === ".") {
      let number = ch;
      let dotCount = ch === "." ? 1 : 0;
      i += 1;
      while (i < input.length) {
        const c = input[i];
        if (c === ".") {
          dotCount += 1;
          if (dotCount > 1) {
            throw new Error("Invalid number format");
          }
          number += c;
          i += 1;
          continue;
        }
        if (c >= "0" && c <= "9") {
          number += c;
          i += 1;
          continue;
        }
        break;
      }

      if (number === ".") {
        throw new Error("Invalid number format");
      }

      tokens.push({ type: "number", value: number });
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "leftParen", value: ch });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rightParen", value: ch });
      i += 1;
      continue;
    }

    if (ch === "+") {
      const prev = tokens[tokens.length - 1];
      const unaryPlus = !prev || prev.type === "operator" || prev.type === "leftParen";
      if (unaryPlus) {
        i += 1;
        continue;
      }
      tokens.push({ type: "operator", value: "+" });
      i += 1;
      continue;
    }

    if (ch === "-") {
      const prev = tokens[tokens.length - 1];
      const unaryMinus = !prev || prev.type === "operator" || prev.type === "leftParen";
      tokens.push({ type: "operator", value: unaryMinus ? "u-" : "-" });
      i += 1;
      continue;
    }

    if (ch === "*" || ch === "/") {
      tokens.push({ type: "operator", value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Unsupported character: ${ch}`);
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      continue;
    }

    if (token.type === "operator") {
      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (
          top.type === "operator" &&
          (
            (RIGHT_ASSOCIATIVE.has(token.value) && OP_PRECEDENCE[top.value] > OP_PRECEDENCE[token.value]) ||
            (!RIGHT_ASSOCIATIVE.has(token.value) && OP_PRECEDENCE[top.value] >= OP_PRECEDENCE[token.value])
          )
        ) {
          output.push(operators.pop() as Token);
          continue;
        }
        break;
      }
      operators.push(token);
      continue;
    }

    if (token.type === "leftParen") {
      operators.push(token);
      continue;
    }

    if (token.type === "rightParen") {
      let foundLeft = false;
      while (operators.length > 0) {
        const top = operators.pop() as Token;
        if (top.type === "leftParen") {
          foundLeft = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeft) {
        throw new Error("Mismatched parentheses");
      }
    }
  }

  while (operators.length > 0) {
    const top = operators.pop() as Token;
    if (top.type === "leftParen" || top.type === "rightParen") {
      throw new Error("Mismatched parentheses");
    }
    output.push(top);
  }

  return output;
}

function evaluateRpn(tokens: Token[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new Error("Invalid number");
      }
      stack.push(value);
      continue;
    }

    if (token.type === "operator") {
      if (token.value === "u-") {
        if (stack.length < 1) {
          throw new Error("Invalid expression");
        }
        const value = stack.pop() as number;
        stack.push(-value);
        continue;
      }

      if (stack.length < 2) {
        throw new Error("Invalid expression");
      }
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      let result = 0;

      if (token.value === "+") result = a + b;
      else if (token.value === "-") result = a - b;
      else if (token.value === "*") result = a * b;
      else if (token.value === "/") {
        if (b === 0) {
          throw new Error("Cannot divide by zero");
        }
        result = a / b;
      }

      if (!Number.isFinite(result)) {
        throw new Error("Computation overflow");
      }

      stack.push(result);
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid expression");
  }

  return stack[0];
}

export function evaluateExpression(expression: string): number {
  const tokens = tokenize(expression);
  const rpn = toRpn(tokens);
  return evaluateRpn(rpn);
}

export function formatCalculationResult(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("Result is not finite");
  }
  const rounded = Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}
