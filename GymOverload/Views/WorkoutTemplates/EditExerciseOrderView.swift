struct EditExerciseOrderView: View {
    @Binding var plannedExercises: [PlannedExercise]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            ForEach(plannedExercises, id: \.id) { exercise in
                HStack {
                    Image(systemName: "line.3.horizontal")
                        .foregroundColor(.gray)
                    Text(exercise.exerciseName)
                }
            }
            .onMove { from, to in
                plannedExercises.move(fromOffsets: from, toOffset: to)
            }
            .onDelete { indexSet in
                plannedExercises.remove(atOffsets: indexSet)
            }
        }
        .navigationTitle("Edit Exercises")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Done") {
                    dismiss()
                }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                EditButton()
            }
        }
    }
}