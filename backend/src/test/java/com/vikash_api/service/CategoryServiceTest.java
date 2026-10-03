package com.vikash_api.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.vikash_api.dtos.requests.CategoryRequest;
import com.vikash_api.entities.CustomCategoryEntity;
import com.vikash_api.entities.DefaultCategoriesEntity;
import com.vikash_api.entities.UserEntity;
import com.vikash_api.exceptions.CategoryNotFoundException;
import com.vikash_api.repositories.CustomCategoryRepository;
import com.vikash_api.repositories.DefaultCategoryRepository;
import com.vikash_api.services.AuthenticatedUserService;
import com.vikash_api.services.CategoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {
    @Mock AuthenticatedUserService authenticatedUserService;
    @Mock CustomCategoryRepository customCategoryRepository;
    @Mock DefaultCategoryRepository defaultCategoryRepository;
    @InjectMocks CategoryService service;

    private UserEntity currentUser() {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", 42L);
        when(authenticatedUserService.getCurrentUser()).thenReturn(user);
        return user;
    }

    @Test
    void createsCategoryForCurrentUserAndReturnsPersistedUuid() {
        UserEntity user = currentUser();
        UUID uuid = UUID.randomUUID();
        when(customCategoryRepository.save(any())).thenAnswer(invocation -> {
            CustomCategoryEntity category = invocation.getArgument(0);
            assertThat(category.getUser()).isSameAs(user);
            category.setUuid(uuid);
            return category;
        });
        var response = service.create(new CategoryRequest("Pets", "paw", "sage"));
        assertThat(response.uuid()).isEqualTo(uuid);
        assertThat(response.name()).isEqualTo("Pets");
        assertThat(response.icon()).isEqualTo("paw");
        assertThat(response.color()).isEqualTo("sage");
    }

    @Test
    void listsDefaultAndOnlyCurrentUsersCustomCategories() {
        currentUser();
        DefaultCategoriesEntity defaultCategory = new DefaultCategoriesEntity();
        ReflectionTestUtils.setField(defaultCategory, "name", "Casa");
        ReflectionTestUtils.setField(defaultCategory, "icon", "house");
        ReflectionTestUtils.setField(defaultCategory, "color", "sage");
        CustomCategoryEntity customCategory = new CustomCategoryEntity();
        customCategory.setUuid(UUID.randomUUID());
        customCategory.setName("Pets");
        customCategory.setIcon("paw");
        customCategory.setColor("blue");
        when(defaultCategoryRepository.findAll()).thenReturn(List.of(defaultCategory));
        when(customCategoryRepository.findByUserId(42L)).thenReturn(List.of(customCategory));
        var response = service.get();
        assertThat(response.defaultCategories().getFirst().uuid()).isNull();
        assertThat(response.defaultCategories().getFirst().name()).isEqualTo("Casa");
        assertThat(response.customCategories().getFirst().uuid()).isEqualTo(customCategory.getUuid());
        verify(customCategoryRepository).findByUserId(42L);
    }

    @Test
    void updatesOwnedCategoryAndPreservesUuid() {
        currentUser();
        UUID uuid = UUID.randomUUID();
        CustomCategoryEntity category = new CustomCategoryEntity();
        category.setUuid(uuid);
        when(customCategoryRepository.findByUuidAndUserId(uuid, 42L)).thenReturn(Optional.of(category));
        when(customCategoryRepository.save(category)).thenReturn(category);
        var response = service.update(uuid, new CategoryRequest("Estudos", "book", "blue"));
        assertThat(response.uuid()).isEqualTo(uuid);
        assertThat(response.name()).isEqualTo("Estudos");
        assertThat(response.icon()).isEqualTo("book");
        assertThat(response.color()).isEqualTo("blue");
    }

    @Test
    void refusesToUpdateCategoryNotOwnedByCurrentUser() {
        currentUser();
        UUID uuid = UUID.randomUUID();
        when(customCategoryRepository.findByUuidAndUserId(uuid, 42L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(uuid, new CategoryRequest("Pets", "paw", "sage")))
                .isInstanceOf(CategoryNotFoundException.class);
        verify(customCategoryRepository, never()).save(any());
    }

    @Test
    void rejectsNameMatchingDefaultIgnoringAccentsAndCase() {
        currentUser();
        var category = new DefaultCategoriesEntity();
        ReflectionTestUtils.setField(category, "name", "Saúde");
        when(defaultCategoryRepository.findAll()).thenReturn(List.of(category));
        assertThatThrownBy(() -> service.create(new CategoryRequest(" SAUDE ", "health", "sage")))
                .isInstanceOf(com.vikash_api.exceptions.CategoryAlreadyExistsException.class);
        verify(customCategoryRepository, never()).save(any());
    }

    @Test
    void rejectsDuplicateCustomNameButAllowsUpdatingSameCategory() {
        currentUser();
        var category = new CustomCategoryEntity();
        category.setUuid(UUID.randomUUID());
        category.setName("Pets");
        when(customCategoryRepository.findByUserId(42L)).thenReturn(List.of(category));
        assertThatThrownBy(() -> service.create(new CategoryRequest("pets", "paw", "blue")))
                .isInstanceOf(com.vikash_api.exceptions.CategoryAlreadyExistsException.class);
        when(customCategoryRepository.findByUuidAndUserId(category.getUuid(), 42L)).thenReturn(Optional.of(category));
        when(customCategoryRepository.save(category)).thenReturn(category);
        assertThat(service.update(category.getUuid(), new CategoryRequest("Pets", "paw", "rose")).color())
                .isEqualTo("rose");
    }
}
