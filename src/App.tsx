
import './App.css'

function App() {
  const images = [
    {
      id: "img-1",
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      alt: "Mountain landscape"
    },
    {
      id: "img-2",
      url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
      alt: "Forest road"
    }
  ];

  const selectImage = (img: { id: string; url: string; alt: string }) => {
    console.log("Sending value to Bloomreach", img);
    window.parent.postMessage(
      {
        type: "br:integration:value",
        value: img.url
      },
      "https://test-brompton.bloomreach.io"
    );
  };

  return (
    <div>
      {images.map(img => (
        <img
          key={img.id}
          src={img.url}
          style={{ width: 200, cursor: "pointer" }}
          onClick={() => selectImage(img)}
        />
      ))}
    </div>
  );
}

export default App
