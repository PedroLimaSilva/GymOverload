struct PlannedExerciseSection: View {
    @Binding var plannedExercise: PlannedExercise

    var body: some View {
        Section(header: Text(plannedExercise.exerciseName)) {
            ForEach(Array(plannedExercise.sets.enumerated()), id: \.element.id) { index, _ in
                let binding = $plannedExercise.sets[index]
                HStack {
                    Stepper(
                        "\(binding.weight.wrappedValue, specifier: "%.1f") kg",
                        value: binding.weight,
                        in: 0...500,
                        step: 2.5
                    )
                    Spacer()
                    Stepper(
                        "\(binding.reps.wrappedValue) reps",
                        value: binding.reps,
                        in: 1...30
                    )
                    Spacer()
                    Stepper(
                        "\(binding.seconds.wrappedValue)s rest",
                        value: binding.seconds,
                        in: 0...300,
                        step: 15
                    )
                }
            }
            .onDelete { offsets in
                plannedExercise.sets.remove(atOffsets: offsets)
            }

            Button {
                plannedExercise.sets.append(
                    PlannedSet(reps: 10, weight: 0, seconds: 60)
                )
            } label: {
                Label("Add Set", systemImage: "plus")
            }
        }
    }
}