package com.notebook.mapper;

import com.notebook.dto.UserDTO;
import com.notebook.vo.UserVO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper  {

    Integer insert(UserDTO user);

    UserVO query(int id);

    Integer update(UserDTO user);
}
