package com.notebook.controller;

import com.notebook.dto.UserDTO;
import com.notebook.service.UserService;
import com.notebook.vo.UserVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    @RequestMapping("/query/{id}")
    public UserVO query(@PathVariable int id){
        return userService.query(id);
    }

    @PostMapping("/insert")
    public Integer insert(@RequestBody UserDTO userDto){
        return userService.insert(userDto);
    }

    @PostMapping("/update")
    public Integer update(@RequestBody UserDTO userDto){
        return userService.update(userDto);
    }
}
