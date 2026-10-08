export async function poseBookCall(client,action,data={}){const {data:result,error}=await client.rpc('nm_pose_book',{p_action:action,p_data:data});if(error)throw error;return result;}
