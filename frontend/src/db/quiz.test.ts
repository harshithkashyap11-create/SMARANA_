import { expect, test } from "vitest";
import { offlineQuestion } from "./quiz";
const family = [
  {
    id: "family",
    patientId: "patient",
    name: "Priya",
    relationship: "daughter",
    photoUrl: "/photo",
  },
];
const memory = {
  id: "memory",
  patientId: "patient",
  title: "Trip",
  occasion: "trip",
  occurredOn: null,
  place: "Riverbank",
  summary: "A walk",
  visibility: "quiz",
  people: [],
  media: [],
};
test("offline quiz only uses consented quiz memories and excludes recent memories", () => {
  expect(offlineQuestion([memory], family, [], true)).toMatchObject({
    memory_id: "memory",
    question_type: "where",
    expected_label: "Riverbank",
  });
  expect(offlineQuestion([memory], family, [], false)).toMatchObject({
    memory_id: null,
    expected_label: "Priya",
  });
  expect(
    offlineQuestion([{ ...memory, visibility: "private" }], family, [], true)
      .memory_id,
  ).toBeNull();
});
test("offline quiz is usable with a single family member or no cached people", () => {
  expect(offlineQuestion([], family, [], false).options).toEqual(["Priya"]);
  expect(offlineQuestion([], [], [], false).options).toEqual([]);
});
