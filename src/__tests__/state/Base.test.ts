import { describe, it, expect, beforeEach } from "vitest";
import { StateBase } from "../../state/Base.ts";

interface TestProps {
  name: string;
  score: number;
  active: boolean;
}

describe("StateBase", () => {
  let state: StateBase<TestProps>;

  beforeEach(() => {
    // Set up DOM elements the state will look for
    document.body.innerHTML = `
      <div id="test-state-name">initial</div>
      <div id="test-state-score">0</div>
      <div id="test-state-active">false</div>
    `;

    state = new StateBase<TestProps>("test-state", {
      name: "foo",
      score: 42,
      active: true,
    });
  });

  describe("constructor", () => {
    it("should set the key", () => {
      expect(state.key).toBe("test-state");
    });

    it("should set the data", () => {
      expect(state.data.name).toBe("foo");
      expect(state.data.score).toBe(42);
      expect(state.data.active).toBe(true);
    });
  });

  describe("onGet", () => {
    it("should return the correct value", () => {
      expect(state.onGet("name")).toBe("foo");
      expect(state.onGet("score")).toBe(42);
    });
  });

  describe("onSet", () => {
    it("should update data", () => {
      state.onSet("name", "bar");
      expect(state.data.name).toBe("bar");
    });
  });

  describe("onRenderData", () => {
    it("should return string representation by default", () => {
      expect(state.onRenderData("name", "hello")).toBe("hello");
      expect(state.onRenderData("score", 99)).toBe("99");
      expect(state.onRenderData("active", true)).toBe("true");
    });
  });

  describe("onUpdateData", () => {
    it("should update the DOM element with matching id", () => {
      state.onUpdateData("name");
      const el = document.getElementById("test-state-name");
      expect(el?.innerHTML).toBe("foo");
    });

    it("should not throw if element does not exist", () => {
      // Create a state with a key that has no matching DOM element
      state.onSet("name", "test");
      expect(() => state.onUpdateData("name")).not.toThrow();
    });
  });

  describe("onRender", () => {
    it("should update all DOM elements", () => {
      state.onRender();

      const nameEl = document.getElementById("test-state-name");
      const scoreEl = document.getElementById("test-state-score");
      const activeEl = document.getElementById("test-state-active");

      expect(nameEl?.innerHTML).toBe("foo");
      expect(scoreEl?.innerHTML).toBe("42");
      expect(activeEl?.innerHTML).toBe("true");
    });

    it("should reflect updated data after onSet", () => {
      state.onSet("name", "updated");
      state.onRender();

      const nameEl = document.getElementById("test-state-name");
      expect(nameEl?.innerHTML).toBe("updated");
    });
  });

  describe("custom onRenderData", () => {
    it("should use custom formatter when overridden", () => {
      state.onRenderData = (key, value) => {
        if (key === "score") return `PTS: ${value}`;
        return String(value);
      };

      state.onUpdateData("score");
      const scoreEl = document.getElementById("test-state-score");
      expect(scoreEl?.innerHTML).toBe("PTS: 42");
    });
  });

  describe("custom onUpdateData", () => {
    it("should use custom updater when overridden", () => {
      const updates: string[] = [];
      state.onUpdateData = (key) => {
        updates.push(String(key));
      };

      state.onUpdateData("name");
      state.onUpdateData("score");

      expect(updates).toEqual(["name", "score"]);
    });
  });

  describe("empty data", () => {
    it("should work with empty object", () => {
      const empty = new StateBase("empty");
      expect(empty.data).toEqual({});
    });
  });
});
