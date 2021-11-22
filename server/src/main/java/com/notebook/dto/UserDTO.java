package com.notebook.dto;

import lombok.Getter;
import lombok.NonNull;
import lombok.Setter;

@Setter
@Getter
public class UserDTO {

    private Integer id;

    @NonNull
    private String username;

    @NonNull
    private String password;

    @NonNull
    private String phone;
}
