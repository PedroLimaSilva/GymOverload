//
//  MultiCategoryPicker.swift
//  GymOverload
//
//  Created by Pedro Lima e Silva on 19/06/2025.
//


import SwiftUI

struct MultiCategoryPicker: View {
    @Binding var selectedCategories: [ExerciseCategory]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(ExerciseCategory.allCases, id: \.self) { category in
                    Toggle(category.rawValue, isOn: Binding(
                        get: { selectedCategories.contains(category) },
                        set: { isSelected in
                            if isSelected {
                                selectedCategories.append(category)
                            } else {
                                selectedCategories.removeAll { $0 == category }
                            }
                        }
                    ))
                }
            }
            .navigationTitle("Select Categories")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}