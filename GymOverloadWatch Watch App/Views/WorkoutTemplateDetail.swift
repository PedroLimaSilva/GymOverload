//
//  WorkoutTemplateDetailView.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 21/06/2025.
//

import SwiftData
import SwiftUI

struct WorkoutTemplateDetail: View {
    let template: WorkoutTemplate

    var body: some View {
        ScrollView {
            VStack(spacing: 4) {
                Button("START") {
                    // TODO: Trigger workout session
                }
                .buttonStyle(.borderedProminent)
                .foregroundColor(.black)
                .tint(.green)
                .frame(maxWidth: .infinity)
                .padding(.horizontal)

                ForEach(template.plannedExercises) { exercise in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(exercise.name)
                            .font(.headline)

                        if !exercise.sets.isEmpty {
                            Text(
                                exercise.sets.map {
                                    String(format: "%.0fkg x%d", $0.weight, $0.reps)
                                }.joined(separator: ", ")
                            )
                            .font(.caption2)
                            .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.gray.opacity(0.2)) // Safe for watchOS
                    )
                    .padding(.horizontal,12)
                }
            }
            .padding(.top)
        }
        .navigationTitle(template.name)
    }
}

#Preview {
    let context = PreviewData.container.mainContext
    let template = try! context.fetch(FetchDescriptor<WorkoutTemplate>()).first!

    return NavigationStack {
        WorkoutTemplateDetail(template: template)
    }
    .modelContainer(PreviewData.container)
}
