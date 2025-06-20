//
//  WorkoutTemplatePager.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//

import SwiftUI
import SwiftData

struct WorkoutTemplateList: View {
    @Query var templates: [WorkoutTemplate]
    @Environment(\.modelContext) private var modelContext
    @State private var selected: WorkoutTemplate?

    var body: some View {
        if templates.isEmpty {
            ContentUnavailableView(
                "No Workouts Available",
                systemImage: "list.bullet.rectangle",
                description: Text("Create some on your iPhone")
            )
        } else {
            NavigationSplitView {
                List(selection: $selected) {
                    ForEach(templates) { template in
                        NavigationLink(value: template){
                            VStack(alignment: .leading) {
                                Text(template.name)
                                    .font(.headline)
                                
                                let cats = categories(in: template)
                                if !cats.isEmpty {
                                    Text(cats.map(\.rawValue).sorted().joined(separator: ", "))
                                        .font(.caption2)
                                        .foregroundColor(.gray)
                                }
                            }
                        }
                    }
                }
                .containerBackground(.background, for: .navigation)
                .navigationTitle("Workouts")
                .listStyle(.carousel)
            } detail: {
                if let selected {
                    WorkoutTemplateDetail(template: selected)
                        .containerBackground(.background, for: .navigation)
                } else {
                    ContentUnavailableView("No Template Selected", systemImage: "list.bullet.rectangle")
                }
            }
        }
    }
    
    private func categories(in template: WorkoutTemplate) -> Set<ExerciseCategory> {
        var result = Set<ExerciseCategory>()
        let allExercises = (try? modelContext.fetch(FetchDescriptor<Exercise>())) ?? []

        for planned in template.plannedExercises {
            if let match = allExercises.first(where: { $0.name == planned.name }) {
                result.formUnion(match.categories)
            }
        }
        return result
    }
}

#Preview {
    WorkoutTemplateList()
        .modelContainer(PreviewData.container)
}
