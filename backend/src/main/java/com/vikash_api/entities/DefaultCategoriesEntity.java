package com.vikash_api.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

@Entity
@Table (name = "default_categories")
@Getter
public class DefaultCategoriesEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column (nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String icon;

    @Column (nullable = false, length = 100)
    private String color;

}
