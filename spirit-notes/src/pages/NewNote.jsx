import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { db, auth, storage } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateFlavorDNA } from '@/api/flavorDna';
import RatingPicker from '@/components/common/RatingPicker';
import FlavorRadarChart from '@/components/common/FlavorRadarChart';
import styles from './NewNote.module.scss';

const NewNote = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    name: '',
    distillery: '',
    category: 'Whisky',
    categoryId: '',
    locationId: '',
    categoryHierarchy: [],
    locationHierarchy: [],
    abv: '',
    volume: '',
    rating: 3.5,
    peat: 0,
    floral: 0,
    fruity: 0,
    woody: 0,
    spicy: 0,
    sweet: 0,
    comment: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allSpirits, setAllSpirits] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const fetchNote = async () => {
      if (!id || !auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'notes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormData({
            ...data,
            title: data.title || '',
            // Ensure values are numbers for range inputs
            peat: data.flavor_axes?.peat || 0,
            floral: data.flavor_axes?.floral || 0,
            fruity: data.flavor_axes?.fruity || 0,
            woody: data.flavor_axes?.woody || 0,
            spicy: data.flavor_axes?.spicy || 0,
            sweet: data.flavor_axes?.sweet || 0,
            categoryHierarchy: data.categoryHierarchy || [],
            locationHierarchy: data.locationHierarchy || [],
            abv: data.abv || '',
            volume: data.volume || ''
          });
          if (data.imageUrl) {
            setImagePreview(data.imageUrl);
          }
        }
      } catch (error) {
        console.error("Error fetching note for edit:", error);
        toast.error("노트 데이터를 불러오는데 실패했습니다.");
      }
    };

    if (isEdit) {
      fetchNote();
    } else if (location.state?.spirit) {
      handleSelectSpirit(location.state.spirit);
    }
  }, [id, isEdit, location.state]);

  // 초기 마운트 시 spirits 전체 목록을 로드
  useEffect(() => {
    const loadAllSpirits = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'spirits'));
        const spirits = [];
        snapshot.forEach(doc => spirits.push({ id: doc.id, ...doc.data() }));
        setAllSpirits(spirits);
      } catch (error) {
        console.error('Failed to load spirits:', error);
      }
    };
    loadAllSpirits();
  }, []);

  const hasSpirit = !!formData.spirit_id;

  // 클라이언트 사이드 부분 문자열 검색 (대소문자 무시)
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const filtered = allSpirits.filter(s => 
      s.name?.toLowerCase().includes(query) ||
      s.distillery?.toLowerCase().includes(query)
    ).slice(0, 8);
    setSearchResults(filtered);
    setShowSearchDropdown(filtered.length > 0);
    setIsSearching(false);
  }, [searchQuery, allSpirits]);

  const handleSelectSpirit = async (spirit) => {
    setLoading(true);
    try {
      // 1. Basic spirit details
      const updateData = {
        name: spirit.name || '',
        distillery: spirit.distillery || '',  // 올바른 필드명
        abv: spirit.abv || '',
        volume: spirit.volume || '',
        peat: spirit.flavor_axes?.peat || 0,
        floral: spirit.flavor_axes?.floral || 0,
        fruity: spirit.flavor_axes?.fruity || 0,
        woody: spirit.flavor_axes?.woody || 0,
        spicy: spirit.flavor_axes?.spicy || 0,
        sweet: spirit.flavor_axes?.sweet || 0,
        spirit_id: spirit.id
      };

      // 2. Fetch Category Hierarchy
      const categoryPath = [];
      if (spirit.categoryId) {
        let currentId = spirit.categoryId;
        while (currentId) {
          const catSnap = await getDoc(doc(db, 'categories', currentId));
          if (catSnap.exists()) {
            const catData = catSnap.data();
            categoryPath.unshift(catData.name);
            currentId = catData.parentId;
          } else {
            currentId = null;
          }
        }
      }

      // 3. Fetch Location Hierarchy
      const locationPath = [];
      if (spirit.locationId) {
        let currentId = spirit.locationId;
        while (currentId) {
          const locSnap = await getDoc(doc(db, 'locations', currentId));
          if (locSnap.exists()) {
            const locData = locSnap.data();
            locationPath.unshift(locData.name);
            currentId = locData.parentId;
          } else {
            currentId = null;
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        ...updateData,
        categoryHierarchy: categoryPath,
        locationHierarchy: locationPath
      }));
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchDropdown(false);
      
      if (spirit.image && !imageFile) {
        setImagePreview(spirit.image);
      }
    } catch (error) {
      console.error("Error populating spirit data:", error);
      toast.error("주류 정보를 가져오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (val) => {
    setFormData(prev => ({ ...prev, rating: val }));
  };

  const handleFlavorChange = (name, val) => {
    setFormData(prev => ({ ...prev, [name]: Number(val) }));
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (uid) => {
    if (!imageFile) return null;
    const fileName = `${Date.now()}_${imageFile.name}`;
    const storageRef = ref(storage, `users/${uid}/notes/${fileName}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!auth.currentUser) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (!formData.name) {
      toast.error('주류 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      const imageUrl = await uploadImage(uid);

      const noteData = {
        title: formData.title || '',
        name: formData.name,
        distillery: formData.distillery,
        category: formData.category,
        categoryId: formData.categoryId || null,
        locationId: formData.locationId || null,
        categoryHierarchy: formData.categoryHierarchy || [],
        locationHierarchy: formData.locationHierarchy || [],
        abv: formData.abv || null,
        volume: formData.volume || null,
        rating: formData.rating,
        comment: formData.comment,
        imageUrl: imageUrl || imagePreview || null, // Keep existing image if no new one
        flavor_axes: {
          peat: formData.peat,
          floral: formData.floral,
          fruity: formData.fruity,
          woody: formData.woody,
          spicy: formData.spicy,
          sweet: formData.sweet
        },
        spirit_id: formData.spirit_id || location.state?.spirit?.id || null, 
        createdAt: isEdit ? (formData.createdAt || serverTimestamp()) : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        await updateDoc(doc(db, 'users', uid, 'notes', id), noteData);
      } else {
        if (!formData.spirit_id) {
          toast.error('주류를 검색하여 선택해주세요.');
          setLoading(false);
          return;
        }
        await addDoc(collection(db, 'users', uid, 'notes'), noteData);
      }

      try {
        await updateFlavorDNA(uid);
      } catch (dnaError) {
        console.warn('Flavor DNA update skipped (Backend offline):', dnaError);
      }

      toast.success(isEdit ? '테이스팅 노트가 수정되었습니다.' : '테이스팅 노트가 안전하게 저장되었습니다.');
      navigate(isEdit ? `/notes/${id}` : '/');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('노트 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const flavorFields = [
    { name: 'peat', label: 'Peat' },
    { name: 'floral', label: 'Floral' },
    { name: 'fruity', label: 'Fruity' },
    { name: 'woody', label: 'Woody' },
    { name: 'spicy', label: 'Spicy' },
    { name: 'sweet', label: 'Sweet' },
  ];

  const chartData = flavorFields.map(f => ({
    subject: f.label,
    value: formData[f.name]
  }));

  return (
    <div className={styles.newNotePage}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.leftSection}>
          <span 
            className={`material-symbols-outlined ${styles.backIcon}`} 
            onClick={() => navigate(-1)}
          >
            arrow_back
          </span>
          <h1>{isEdit ? 'Edit Note' : 'Tasting Notes'}</h1>
        </div>
        <span className={`material-symbols-outlined ${styles.moreIcon}`}>
          more_vert
        </span>
      </header>

      <form onSubmit={handleSubmit} className={styles.noteForm}>
        {/* Note Title */}
        <section className={styles.titleSection}>
          <input 
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="노트 제목 입력 (예: 친구와의 첫 만남)"
            className={styles.titleInput}
          />
        </section>

        {/* Photo Upload */}
        <section className={styles.photoUpload} onClick={handleImageClick}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          {imagePreview ? (
            <div className={styles.previewContainer}>
              <img src={imagePreview} alt="Preview" className={styles.previewImg} />
              <div className={styles.changeOverlay}>
                <span className="material-symbols-outlined">edit</span>
                <span>Change Photo</span>
              </div>
            </div>
          ) : (
            <div className={styles.uploadPlaceholder}>
              <div className={styles.iconWrapper}>
                <span className={`material-symbols-outlined ${styles.uploadIcon}`}>add_a_photo</span>
              </div>
              <p className={styles.label}>
                Upload Whiskey Photo
              </p>
            </div>
          )}
        </section>

        {/* Spirit Search - formSection 바깥에 배치하여 드롭다운이 다른 섹션에 가리지 않게 함 */}
        {!isEdit && (
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
              <input 
                type="text" 
                placeholder="주류 검색 (이름으로 찾기)" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length < 1) setShowSearchDropdown(false);
                }}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className={styles.searchInput}
              />
              {isSearching && <span className={`material-symbols-outlined ${styles.spinner}`}>progress_activity</span>}
              {!isSearching && hasSpirit && (
                <span 
                  className={`material-symbols-outlined ${styles.clearIcon}`}
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      name: '', distillery: '', abv: '', volume: '',
                      categoryId: '', locationId: '', categoryHierarchy: [], locationHierarchy: [],
                      spirit_id: '', peat: 0, floral: 0, fruity: 0, woody: 0, spicy: 0, sweet: 0
                    }));
                    setImagePreview(null);
                    setSearchQuery('');
                  }}
                >close</span>
              )}
            </div>
            
            {showSearchDropdown && searchResults.length > 0 && (
              <ul className={styles.searchResults}>
                {searchResults.map(spirit => (
                  <li key={spirit.id} onMouseDown={() => handleSelectSpirit(spirit)}>
                    <div className={styles.resultInfo}>
                      <span className={styles.resultName}>{spirit.name}</span>
                      <span className={styles.resultMeta}>
                        {spirit.distillery && `${spirit.distillery} · `}{spirit.abv}% · {spirit.volume}ml
                      </span>
                    </div>
                    <span className="material-symbols-outlined">add_circle</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Basic Info */}
        <section className={styles.formSection}>
          <h2>Basic Details</h2>

          {/* 선택된 주류 정보: 검색 전에는 숨김, 검색 후 또는 수정 시에만 표시 */}
          {(hasSpirit || isEdit) && (
            <div className={styles.formInside}>
              <div className={styles.inputGroup}>
                <label>Liquor Name</label>
                <input 
                  name="name" value={formData.name} onChange={handleChange} 
                  placeholder="검색하여 주류를 선택하세요" 
                  className={`${styles.textInput} ${styles.large} ${hasSpirit ? styles.readOnly : ''}`} 
                  required 
                  readOnly={hasSpirit || !isEdit}
                />
              </div>

              {/* Hierarchical Info */}
              {(formData.categoryHierarchy.length > 0 || formData.locationHierarchy.length > 0) && (
                <div className={styles.hierarchyInfo}>
                  {formData.categoryHierarchy.length > 0 && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Category:</span>
                      <span className={styles.infoValue}>{formData.categoryHierarchy.join(' > ')}</span>
                    </div>
                  )}
                  {formData.locationHierarchy.length > 0 && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Origin:</span>
                      <span className={styles.infoValue}>{formData.locationHierarchy.join(' > ')}</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.gridInputs}>
                <div className={styles.inputGroup}>
                  <label>Distillery / Brand</label>
                  <input 
                    name="distillery" value={formData.distillery} onChange={handleChange} 
                    placeholder="Distillery" 
                    className={`${styles.textInput} ${hasSpirit ? styles.readOnly : ''}`} 
                    readOnly={hasSpirit || !isEdit}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>ABV (%)</label>
                  <input 
                    type="number" step="0.1"
                    name="abv" value={formData.abv} onChange={handleChange} 
                    placeholder="0.0" 
                    className={`${styles.textInput} ${hasSpirit ? styles.readOnly : ''}`} 
                    readOnly={hasSpirit || !isEdit}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Volume (ml)</label>
                  <input 
                    type="number"
                    name="volume" value={formData.volume} onChange={handleChange} 
                    placeholder="0" 
                    className={`${styles.textInput} ${hasSpirit ? styles.readOnly : ''}`} 
                    readOnly={hasSpirit || !isEdit}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Overall Rating */}
        <section className={`${styles.formSection} ${styles.centered}`}>
          <h2>Overall Rating</h2>
          <RatingPicker value={formData.rating} onChange={handleRatingChange} />
        </section>

        {/* Radar Chart + Flavor Sliders */}
        <section className={styles.formSection}>
          <h2>Flavor Profile</h2>
          
          {/* Radar Chart Area */}
          <div className={styles.radarContainer}>
            <div className={styles.radarGrid}></div>
            <div className={`${styles.radarGrid} ${styles.scale75}`}></div>
            <div className={`${styles.radarGrid} ${styles.scale50}`}></div>
            <div className={`${styles.radarGrid} ${styles.scale25}`}></div>
            
            <div className={styles.chartWrapper}>
              <FlavorRadarChart data={chartData} color="#ffc63e" height={240} />
            </div>
          </div>

          {/* Sliders List (Improved UX) */}
          <div className={styles.flavorControlList}>
            {flavorFields.map(field => (
              <div key={field.name} className={styles.flavorControlItem}>
                <div className={styles.flavorHeader}>
                  <label>{field.label}</label>
                  <span className={styles.flavorValue}>{formData[field.name]}</span>
                </div>
                <div className={styles.controlRow}>
                  <button 
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => handleFlavorChange(field.name, Math.max(0, formData[field.name] - 1))}
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <div className={styles.sliderWrapper}>
                    <input 
                      type="range" min="0" max="10" step="0.5" 
                      value={formData[field.name]} 
                      onChange={(e) => handleFlavorChange(field.name, e.target.value)}
                      className={styles.horizontalSlider}
                    />
                    <div 
                      className={styles.sliderProgress} 
                      style={{ width: `${(formData[field.name] / 10) * 100}%` }}
                    />
                  </div>
                  <button 
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => handleFlavorChange(field.name, Math.min(10, formData[field.name] + 1))}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Text Memo */}
        <section className={styles.formSection}>
          <h2>Memories & Notes</h2>
          <textarea 
            name="comment" value={formData.comment} onChange={handleChange} rows={5}
            placeholder="맛의 밸런스, 타격감, 피니시 등 자유롭게 기록하세요." 
            className={styles.textareaInput}
          />
        </section>
      </form>

      {/* Sticky Save Button */}
      <footer className={styles.stickyFooter}>
        <button 
          onClick={handleSubmit}
          className={styles.saveButton}
          disabled={loading}
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin">refresh</span>
          ) : (
            <span className={`material-symbols-outlined ${styles.icon}`}>save</span>
          )}
          {loading ? '저장 중...' : (isEdit ? '수정사항 저장하기' : '테이스팅 노트 저장하기')}
        </button>
      </footer>
    </div>
  );
};

export default NewNote;

