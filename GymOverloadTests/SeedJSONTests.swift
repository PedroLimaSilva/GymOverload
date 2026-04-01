//
//  SeedJSONTests.swift
//  GymOverloadTests
//

import XCTest

@testable import GymOverload

final class SeedJSONTests: XCTestCase {

    func testDecodesBundledExercises() throws {
        let url = try XCTUnwrap(
            Bundle(for: SeedJSONTests.self).url(forResource: "exercises", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let decoded = try JSONDecoder().decode([ExerciseDTO].self, from: data)
        XCTAssertFalse(decoded.isEmpty, "Expected at least one exercise in test bundle JSON")
        let first = try XCTUnwrap(decoded.first)
        XCTAssertFalse(first.name.isEmpty)
    }

    func testDecodesBundledTemplates() throws {
        let url = try XCTUnwrap(
            Bundle(for: SeedJSONTests.self).url(forResource: "templates", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let decoded = try JSONDecoder().decode([WorkoutTemplateDTO].self, from: data)
        XCTAssertFalse(decoded.isEmpty, "Expected at least one template in test bundle JSON")
        let first = try XCTUnwrap(decoded.first)
        XCTAssertFalse(first.name.isEmpty)
        XCTAssertFalse(first.plannedExercises.isEmpty)
    }

    func testExerciseDTORoundTripThroughModel() throws {
        let url = try XCTUnwrap(
            Bundle(for: SeedJSONTests.self).url(forResource: "exercises", withExtension: "json")
        )
        let data = try Data(contentsOf: url)
        let decoded = try JSONDecoder().decode([ExerciseDTO].self, from: data)
        let original = try XCTUnwrap(decoded.first)
        let model = original.toModel()
        let back = ExerciseDTO(from: model)
        XCTAssertEqual(back.name, original.name)
        XCTAssertEqual(back.categories, original.categories)
        XCTAssertEqual(back.defaultRestSeconds, original.defaultRestSeconds)
        XCTAssertEqual(back.weightUnit, original.weightUnit)
        XCTAssertEqual(back.kind, original.kind)
    }
}
