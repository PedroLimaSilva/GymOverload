//
//  WorkoutTemplateListView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//


import SwiftUI
import SwiftData

struct WorkoutTemplateList: View {
    @Query var templates: [WorkoutTemplate]
    @Query var allExercises: [Exercise] // So we can match by name

    var body: some View {
        List {
            ForEach(templates) { template in
                NavigationLink(destination: WorkoutTemplateDetail(template: template)) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(template.name)
                            .font(.headline)
                            .lineLimit(1)

                        let matchedCategories = categories(in: template)

                        if !matchedCategories.isEmpty {
                            Text(matchedCategories.map(\.rawValue).sorted().joined(separator: ", "))
                                .font(.caption2)
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .navigationTitle("Workouts")
    }

    private func categories(in template: WorkoutTemplate) -> Set<ExerciseCategory> {
        var result = Set<ExerciseCategory>()

        for planned in template.plannedExercises {
            if let match = allExercises.first(where: { $0.name == planned.name }) {
                result.formUnion(match.categories)
            }
        }

        return result
    }
}

#Preview {
    NavigationStack {
        WorkoutTemplateList()
    }
    .modelContainer(PreviewData.container)
}
