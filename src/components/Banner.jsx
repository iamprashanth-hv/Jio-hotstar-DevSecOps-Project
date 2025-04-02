import React from 'react'
import './Banner.css'
import  { useEffect, useState } from 'react'


function Banner() {

    const [show,setShow]=useState(false)
  useEffect(()=>{
    window.addEventListener("scroll",()=>{
      if(window.scrollY>100){
        setShow(true)
      }
      else{
        setShow(false)
      }
    })
  })
  return (
    <div className='banner'>

    <div className='bbc'>
        <div className='st'>
          <img src="https://img.hotstar.com/image/upload/v1737554969/web-assets/prod/images/rebrand/logo.png" alt="" />
          </div>
       
        
        <div className={`cc ${show && "black"}`}>
          
        </div>
    </div>

    </div>
  )
}

export default Banner