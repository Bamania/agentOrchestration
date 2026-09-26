/* Now we need to write a tool that will manage the 6 operation that mirror file system commands
    -view,Folder,File
    -create,Newfile
    -edit,ExistingFile
    -insert,atSpecificLine
    -delete,file or Folder
    -rename,move or rename ! (as renaming the path will result in the move )

*/
import fs from 'node:fs';
import type { constants } from 'node:module';


async function readFile(path: string): Promise<string> {
    //This is called promisifying the async fx !
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);       
      } else {
        resolve(data);      
      }
    });
  });
}


async function readFolder(path: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err);      
      } else {
        resolve(files);     
      }
    });
  });
}

async function createFile(path:string,fileName:string,file_text:string=""):Promise<string>{
  const  filepath=path + "/" + fileName;
    return new Promise((res,rej)=>{
        fs.writeFile(filepath, file_text!,(err)=>{
            if(err){
                rej(err);
            }else {
                res(`File Created at ${filepath}`);
            }
        });
    })
    
}



//@-UPDATE-try to make it more easy if possible ! with less stl fx !
async function editFile(path: string, old_str: string, new_str: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      // @UPDATE change it with less stl fx
      const updated = data.replaceAll(old_str, new_str);
      fs.writeFile(path, updated, (writeErr) => {
        if (writeErr) {
          reject(writeErr);
        } else {
          resolve(`Text replaced in ${path}`);
        }
      });
    });
  });
}

//@-UPDATE-try to make it more easy if possible ! with less stl fx !
async function insertAtLine(
  path: string,
  insert_line: number,
  insert_text: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const lines = data.split('\n');
      // insert_line is 1-indexed, convert to 0-indexed
      lines.splice(insert_line - 1, 0, insert_text);
      const updated = lines.join('\n');
      fs.writeFile(path, updated, (writeErr) => {
        if (writeErr) {
          reject(writeErr);
        } else {
          resolve(`Text inserted at line ${insert_line}`);
        }
      });
    });
  });
}

//@UPDATE-try to make it more easy if possible ! with less stl fx !
async function deleteFileOrFolder(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.lstat(path, (err, stats) => {
      if (err) {
        reject(err);
        return;
      }
      if (stats.isDirectory()) {
        // execute recursively cmd 
        fs.rm(path, { recursive: true, force: true }, (rmErr) => {
          if (rmErr) {
            reject(rmErr);
          } else {
            resolve(`Directory deleted: ${path}`);
          }
        });
      } else {
        

        //@UPDATE didnt know about this helper fx ! if possible try to replace it with first principle approached fx ! 
        fs.unlink(path, (unlinkErr) => {
          if (unlinkErr) {
            reject(unlinkErr);
          } else {
            resolve(`File deleted: ${path}`);
          }
        });
      }
    });
  });
}


async function renameOrMove(path: string, new_path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.rename(path, new_path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(`Moved /renamed: ${path} → ${new_path}`);
      }
    });
  });
}

async function memory(path:string,command:string,file_text?:string,old_str?:string,new_str?:string,insert_line?:number,insert_text?:string,new_path?:string){
    const stat=fs.lstatSync(path);
    if(command=="view"){
        //check if it is a file or folder
        if(stat.isFile()){
           const data=await readFile(path)
           return data;

        }
        else if(stat.isDirectory()){
            const data=await readFolder(path)
            return data;
        } 
    }else if(command=="create"){
        return await createFile(path,file_text!)
    }
    else if(command=="str_replace"){
        return await editFile(path,old_str!,new_str!)
    }else if(command=="insert"){
        return await insertAtLine(path,insert_line!,insert_text!)
    }else if(command=="delete"){
        return await deleteFileOrFolder(path);
    } else if( command=="rename"){
        return await renameOrMove(path,new_path!);
    }
}

// write me a fx that will validate the path is inside the base directory and not outside it !


const BASE_PATH="./home"
const CURRENT_PATH="./home/pkgs/test1"
const homeDir=["pkgs","src"]
const TEST_PATH_1="./home/src" //invalid
const TEST_PATH_2="./home/src/folder1" // invalid
const TEST_PATH_3="../../src" //valid
const TEST_PATH_4="../../../outsideFolder" //not allowed
const TEST_PATH_5="../../../" //not allowed

// @Update-fix this validate Path function
function validatePath(currPath:string,BASE_PATH:string,finalPath:string){

  // check whether the final path is inside the BASE_PATH or not !
  //obs 1-path cmd will start from ./ or ../ right
  const dirs=finalPath.split("/");
  const basePath=BASE_PATH.split("/");
  // dirs=[.,home,src]
  const currPathdirs=currPath.split("/")
  // [ . , home, pkgs, test1]
  let cnt=0;
  for(let i in dirs){
    if(dirs[i]==".."){
      cnt++;
    }
  }

  if(cnt>currPathdirs.length-2){
    console.log("invalid")
    return 0;
      }else if (cnt==currPathdirs.length-2){
      console.log("valid")
      return 1;
  }else if(dirs[0]=="."){
    if(dirs[1]==currPathdirs[currPathdirs.length-1]){
      console.log("valid")
      return 1;
    }; //the path is inside the current path
    // now the cmds second path should match to this dirs[1]
  } else if (dirs[0]==".."){
    if(dirs[1]==currPathdirs[currPathdirs.length-1]){
      console.log("path valid");
      return 1;
    } else {
      console.log("invalid")
      return 0;
    }
      //it means 
  }
}