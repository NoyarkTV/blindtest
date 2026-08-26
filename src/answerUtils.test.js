import { isAcceptedTitle } from "./answerUtils";

test("accepte un titre sans article anglais", () => {
  expect(isAcceptedTitle("Avengers", ["The Avengers"])).toBe(true);
});

test("accepte un titre sans article français", () => {
  expect(isAcceptedTitle("Etrange Noel de Monsieur Jack", ["L'Étrange Noël de Monsieur Jack"])).toBe(true);
});

test("n'accepte pas une grosse approximation sur un titre court", () => {
  expect(isAcceptedTitle("Wars", ["Cars"])).toBe(false);
  expect(isAcceptedTitle("It", ["Up"])).toBe(false);
});

test("accepte une petite faute sur un titre assez long", () => {
  expect(isAcceptedTitle("Interstelar", ["Interstellar"])).toBe(true);
});

test("accepte exactement un titre court", () => {
  expect(isAcceptedTitle("Dune", ["Dune"])).toBe(true);
});
