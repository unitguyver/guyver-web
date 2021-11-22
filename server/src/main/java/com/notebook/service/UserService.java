package com.notebook.service;

import com.notebook.dto.UserDTO;
import com.notebook.mapper.UserMapper;
import com.notebook.vo.UserVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(rollbackFor=Exception.class)
public class UserService {

    @Autowired
    UserMapper userMapper;

    public UserVO query(int id){
        return userMapper.query(id);
    }

    public Integer insert(UserDTO user){
        return userMapper.insert(user);
    }

    public Integer update(UserDTO user){
        return userMapper.update(user);
    }

}
